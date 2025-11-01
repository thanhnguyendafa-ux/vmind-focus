

import { StudySettings, VocabTable, Relation, StudyQuestion, VocabRow, StudyMode, VocabRowStats, SortRule } from "../types";
import { calculatePriorityScore } from "./priorityScore";

// --- Helper Functions ---

const shuffle = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const findDistractors = (
    allRows: VocabRow[],
    answerCols: string[],
    correctRow: VocabRow,
    count: number
): string[] => {
    const distractors: Set<string> = new Set();
    const correctAnwerText = answerCols.map(col => correctRow.cols[col] || '').join(' / ');
    const possibleRows = shuffle([...allRows.filter(r => r.id !== correctRow.id)]);
    
    for (const row of possibleRows) {
        if (distractors.size >= count) break;
        const distractorText = answerCols.map(col => row.cols[col] || '').join(' / ');
        if (distractorText && distractorText !== correctAnwerText) {
            distractors.add(distractorText);
        }
    }
    
    return Array.from(distractors);
};

const createQuestionFromStub = (
    row: VocabRow & { tableId: string },
    relation: Relation,
    mode: StudyMode,
    tables: VocabTable[]
): StudyQuestion | null => {
    const questionLines = [
        'Question:',
        ...relation.questionCols.map(c => `${c}: ${row.cols[c] || ''}`)
    ];
    const answerPromptLines = [
        'Answer is:',
        ...relation.answerCols.map(c => `${c}: ????`)
    ];
    const questionContent = `${questionLines.join('\n')}\n\n${answerPromptLines.join('\n')}`;
    const answerContent = relation.answerCols.map(c => row.cols[c] || '').join(' / ');
    
    if (relation.questionCols.every(c => !row.cols[c]) || relation.answerCols.every(c => !row.cols[c])) {
        return null;
    }

    const baseQuestion = {
        id: `${row.id}-${relation.id}-${Math.random()}`,
        vocabRow: row,
        tableId: row.tableId,
        relation: relation,
        questionContent,
    };
    
    const table = tables.find(t => t.id === relation.tableId)!;
    const allRowsInTable = table.rows;

    if (mode === 'MCQ') {
        const distractors = findDistractors(allRowsInTable, relation.answerCols, row, 3);
        if (distractors.length < 1) return null;
        const mcqOptions = shuffle([answerContent, ...distractors]);
        return { ...baseQuestion, mode, answerContent, mcqOptions };
    } else if (mode === 'Typing') {
        return { ...baseQuestion, mode, answerContent };
    } else if (mode === 'TF') {
        const tfIsCorrect = Math.random() > 0.5;
        if (tfIsCorrect) {
            return { ...baseQuestion, mode, answerContent, tfIsCorrect: true };
        } else {
            const [distractor] = findDistractors(allRowsInTable, relation.answerCols, row, 1);
            if (!distractor || distractor === answerContent) return null;
            return { ...baseQuestion, mode, answerContent: distractor, tfIsCorrect: false };
        }
    }
    return null;
}


export const regenerateQuestionForRow = (
    row: VocabRow & { tableId: string },
    settings: StudySettings,
    tables: VocabTable[],
    relations: Relation[]
): StudyQuestion | null => {
    const { selectedRelationIds, selectedModes, randomizeModes, randomRelation } = settings;
    
    // 1. Find an applicable relation
    let applicableRelations: Relation[] = [];
    if (randomRelation) {
      applicableRelations = relations.filter(r => r.tableId === row.tableId && r.modes.some(m => selectedModes.includes(m)));
    } else {
      applicableRelations = relations.filter(r => selectedRelationIds.includes(r.id) && r.tableId === row.tableId);
    }
     // CRITERIA MODE FALLBACK: If no relations match (e.g., from table mode), find any compatible relation for this word.
    if (applicableRelations.length === 0) {
        applicableRelations = relations.filter(r => r.tableId === row.tableId);
    }

    if (applicableRelations.length === 0) return null;
    const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];

    // 2. Find a compatible mode
    // CRITERIA MODE FALLBACK: If selected modes are empty, use any of the relation's modes.
    const modesToUse = selectedModes.length > 0 ? selectedModes : studyModes;
    const compatibleModes = relation.modes.filter(m => modesToUse.includes(m));

    if (compatibleModes.length === 0) return null;
    const mode = compatibleModes[Math.floor(Math.random() * compatibleModes.length)];

    // 3. Create and return the new question
    return createQuestionFromStub(row, relation, mode, tables);
};

// --- Main Generator Function ---

const STATS_COLUMNS_FOR_SORT: { key: keyof VocabRowStats | 'priorityScore'; label: string; type: 'string' | 'number' | 'boolean' | 'date' }[] = [
    { key: 'priorityScore', label: 'Priority Score', type: 'number' },
    { key: 'RankPoint', label: 'Rank Point', type: 'number' },
    { key: 'SuccessRate', label: 'Success Rate', type: 'number' },
    { key: 'Level', label: 'Level', type: 'number' },
    { key: 'LastPracticeDate', label: 'Last Practiced', type: 'date' },
    { key: 'flashcardStatus', label: 'Flashcard Status', type: 'string' },
    { key: 'Passed1', label: 'Passed1', type: 'number' },
    { key: 'Passed2', label: 'Passed2', type: 'number' },
    { key: 'Failed', label: 'Failed', type: 'number' },
    { key: 'TotalAttempt', label: 'Attempts', type: 'number' },
    { key: 'InQueue', label: 'In Queue Count', type: 'number' },
    { key: 'QuitQueue', label: 'Quit Queue', type: 'boolean' },
];

const studyModes: StudyMode[] = ['MCQ', 'TF', 'Typing', 'Scrambled'];


export const generateStudySession = (
  settings: StudySettings,
  tables: VocabTable[],
  relations: Relation[]
): StudyQuestion[] => {
  const { 
    studyMode,
    criteriaSorts,
    selectedTableIds, 
    selectedRelationIds, 
    selectedModes, 
    randomizeModes, 
    randomRelation,
    isManualMode,
    manualWordIds,
    wordCount,
    wordSelectionStrategy,
    perTableSorts,
    queueCompositionStrategy,
    tablePercentages,
  } = settings;


  if (studyMode === 'criteria') {
    if (!criteriaSorts || criteriaSorts.length === 0 || selectedTableIds.length === 0 || selectedModes.length === 0) {
        return [];
    }

    const selectedTables = tables.filter(t => selectedTableIds.includes(t.id));
    const isMultiTable = selectedTables.length > 1;

    let finalRows: (VocabRow & { tableId: string })[] = [];

    if (isMultiTable && (queueCompositionStrategy === 'balanced' || queueCompositionStrategy === 'percentage')) {
        const sortedWordsByTable: { [tableId: string]: (VocabRow & { tableId: string })[] } = {};

        for (const table of selectedTables) {
            let tableRows = table.rows.map(r => ({ ...r, tableId: table.id }));
            
            tableRows = tableRows.filter(row => {
                const applicableRelations = randomRelation
                    ? relations.filter(r => r.tableId === row.tableId && r.modes.some(m => selectedModes.includes(m)))
                    : relations.filter(r => selectedRelationIds.includes(r.id) && r.tableId === row.tableId);
                return applicableRelations.length > 0;
            });
            
            const maxInQueue = Math.max(...tableRows.map(r => r.stats.InQueue), 1);
            
            tableRows.sort((a, b) => {
                for (const rule of criteriaSorts) {
                    const statColInfo = STATS_COLUMNS_FOR_SORT.find(sc => sc.label === rule.column);
                    if (!statColInfo) continue;
                    let valA: any = statColInfo.key === 'priorityScore' ? calculatePriorityScore(a, maxInQueue) : a.stats[statColInfo.key as keyof VocabRowStats];
                    let valB: any = statColInfo.key === 'priorityScore' ? calculatePriorityScore(b, maxInQueue) : b.stats[statColInfo.key as keyof VocabRowStats];
                    if (valA === null || valA === undefined) valA = statColInfo.type === 'number' ? -Infinity : '';
                    if (valB === null || valB === undefined) valB = statColInfo.type === 'number' ? -Infinity : '';
                    let comparison = 0;
                    if (statColInfo.type === 'number') comparison = Number(valA) - Number(valB);
                    else if (statColInfo.type === 'date') comparison = (new Date(valA).getTime() || 0) - (new Date(valB).getTime() || 0);
                    else comparison = String(valA).localeCompare(String(valB));
                    if (comparison !== 0) return rule.direction === 'asc' ? comparison : -comparison;
                }
                return 0;
            });

            sortedWordsByTable[table.id] = tableRows;
        }

        if (queueCompositionStrategy === 'balanced') {
            const numTables = selectedTableIds.length;
            const wordsPerTable = Math.floor(wordCount / numTables);
            let remainder = wordCount % numTables;
            for (const tableId of selectedTableIds) {
                const takeCount = wordsPerTable + (remainder > 0 ? 1 : 0);
                finalRows.push(...(sortedWordsByTable[tableId] || []).slice(0, takeCount));
                if (remainder > 0) remainder--;
            }
        } else { // 'percentage'
            let wordsTaken = 0;
            const totalPercentage = selectedTableIds.reduce((sum, id) => sum + (tablePercentages[id] || 0), 0);
            for (let i = 0; i < selectedTableIds.length; i++) {
                const tableId = selectedTableIds[i];
                const tableRows = sortedWordsByTable[tableId] || [];
                if (i === selectedTableIds.length - 1) {
                    finalRows.push(...tableRows.slice(0, wordCount - wordsTaken));
                } else {
                    const percentage = (tablePercentages[tableId] || 0) / (totalPercentage || 100);
                    const takeCount = Math.round(wordCount * percentage);
                    finalRows.push(...tableRows.slice(0, takeCount));
                    wordsTaken += takeCount;
                }
            }
        }
    } else {
        // Original logic: sort all tables together
        let candidateRows = selectedTables.flatMap(t => t.rows.map(r => ({ ...r, tableId: t.id })));
        candidateRows = candidateRows.filter(row => {
            const applicableRelations = randomRelation
                ? relations.filter(r => r.tableId === row.tableId && r.modes.some(m => selectedModes.includes(m)))
                : relations.filter(r => selectedRelationIds.includes(r.id) && r.tableId === row.tableId);
            return applicableRelations.length > 0;
        });
        const maxInQueue = Math.max(...candidateRows.map(r => r.stats.InQueue), 1);
        candidateRows.sort((a, b) => {
            for (const rule of criteriaSorts) {
                const statColInfo = STATS_COLUMNS_FOR_SORT.find(sc => sc.label === rule.column);
                if (!statColInfo) continue;
                let valA: any = statColInfo.key === 'priorityScore' ? calculatePriorityScore(a, maxInQueue) : a.stats[statColInfo.key as keyof VocabRowStats];
                let valB: any = statColInfo.key === 'priorityScore' ? calculatePriorityScore(b, maxInQueue) : b.stats[statColInfo.key as keyof VocabRowStats];
                if (valA === null || valA === undefined) valA = statColInfo.type === 'number' ? -Infinity : '';
                if (valB === null || valB === undefined) valB = statColInfo.type === 'number' ? -Infinity : '';
                let comparison = 0;
                if (statColInfo.type === 'number') comparison = Number(valA) - Number(valB);
                else if (statColInfo.type === 'date') comparison = (new Date(valA).getTime() || 0) - (new Date(valB).getTime() || 0);
                else comparison = String(valA).localeCompare(String(valB));
                if (comparison !== 0) return rule.direction === 'asc' ? comparison : -comparison;
            }
            return 0;
        });
        finalRows = candidateRows.slice(0, wordCount);
    }
    
    const questionPool: StudyQuestion[] = [];
    for (const row of finalRows) {
        const question = regenerateQuestionForRow(row, settings, tables, relations);
        if (question) questionPool.push(question);
    }
    return shuffle(questionPool);
  }
  
  // --- Table Mode Logic ---

  const allRowsFromSelectedTables = tables
    .filter(t => selectedTableIds.includes(t.id))
    .flatMap(t => t.rows.map(r => ({...r, tableId: t.id})));

  // FIX: Declare candidateRows before it is assigned in conditional branches.
  let candidateRows: (VocabRow & { tableId: string })[] = [];

  if (isManualMode) {
      candidateRows = manualWordIds
        .map(id => allRowsFromSelectedTables.find(row => row.id === id))
        .filter((row): row is VocabRow & { tableId: string } => !!row);
  } else {
    // --- Automatic Mode ---
    const usePerTableStrategy = wordSelectionStrategy === 'perTable';

    const maxInQueueByTable: { [tableId: string]: number } = {};
    tables.forEach(table => {
        const max = table.rows.reduce((maxVal, row) => Math.max(maxVal, row.stats.InQueue), 0);
        maxInQueueByTable[table.id] = max > 0 ? max : 1;
    });

    if (usePerTableStrategy) {
        // --- Advanced Per-Table Sorting and Composition ---
        const sortedWordsByTable: { [tableId: string]: (VocabRow & { tableId: string })[] } = {};

        for (const tableId of selectedTableIds) {
            const table = tables.find(t => t.id === tableId);
            if (!table) continue;

            const sortRules = (perTableSorts[tableId] || []).filter(r => r.column);
            let sortedRows = [...table.rows];

            sortedRows.sort((a, b) => {
                for (const rule of sortRules) {
                    const statColInfo = STATS_COLUMNS_FOR_SORT.find(sc => sc.label === rule.column);
                    let valA: any, valB: any, type: string;

                    if (statColInfo) {
                        type = statColInfo.type;
                        if (statColInfo.key === 'priorityScore') {
                            valA = calculatePriorityScore(a, maxInQueueByTable[tableId]);
                            valB = calculatePriorityScore(b, maxInQueueByTable[tableId]);
                        } else {
                            valA = a.stats[statColInfo.key as keyof VocabRowStats];
                            valB = b.stats[statColInfo.key as keyof VocabRowStats];
                        }
                    } else {
                        type = 'string';
                        valA = a.cols[rule.column];
                        valB = b.cols[rule.column];
                    }

                    let comparison = 0;
                    if (valA === null || valA === undefined) valA = type === 'number' ? -Infinity : '';
                    if (valB === null || valB === undefined) valB = type === 'number' ? -Infinity : '';

                    if (type === 'number') {
                        comparison = Number(valA) - Number(valB);
                    } else if (type === 'date') {
                        const dateA = new Date(valA).getTime() || 0;
                        const dateB = new Date(valB).getTime() || 0;
                        comparison = dateA - dateB;
                    } else {
                        comparison = String(valA).localeCompare(String(valB));
                    }
                    
                    if (comparison !== 0) {
                        return rule.direction === 'asc' ? comparison : -comparison;
                    }
                }
                return 0;
            });
            sortedWordsByTable[tableId] = sortedRows.map(r => ({ ...r, tableId }));
        }

        let finalCandidateRows: (VocabRow & { tableId: string })[] = [];
        if (queueCompositionStrategy === 'balanced' || selectedTableIds.length <= 1) {
            const numTables = selectedTableIds.length;
            const wordsPerTable = numTables > 0 ? Math.floor(wordCount / numTables) : 0;
            let remainder = numTables > 0 ? wordCount % numTables : 0;
            for (const tableId of selectedTableIds) {
                const takeCount = wordsPerTable + (remainder > 0 ? 1 : 0);
                finalCandidateRows.push(...sortedWordsByTable[tableId].slice(0, takeCount));
                if (remainder > 0) remainder--;
            }
        } else { // 'percentage'
            let wordsTaken = 0;
            const totalPercentage = selectedTableIds.reduce((sum, id) => sum + (tablePercentages[id] || 0), 0);
            
            for (let i = 0; i < selectedTableIds.length; i++) {
                const tableId = selectedTableIds[i];
                if (i === selectedTableIds.length - 1) {
                    const remainingWords = wordCount - wordsTaken;
                    finalCandidateRows.push(...sortedWordsByTable[tableId].slice(0, remainingWords));
                } else {
                    const percentage = (tablePercentages[tableId] || 0) / (totalPercentage || 100);
                    const takeCount = Math.round(wordCount * percentage);
                    finalCandidateRows.push(...sortedWordsByTable[tableId].slice(0, takeCount));
                    wordsTaken += takeCount;
                }
            }
        }
        candidateRows = finalCandidateRows.slice(0, wordCount);

    } else {
        const scoredRows = allRowsFromSelectedTables.map(row => ({
            row,
            score: calculatePriorityScore(row, maxInQueueByTable[row.tableId])
        }));
        
        scoredRows.sort((a, b) => b.score - a.score);
        candidateRows = scoredRows.slice(0, wordCount).map(item => item.row);
    }
  }

  const potentialQuestionStubs: { row: VocabRow & { tableId: string }; relation: Relation }[] = [];
  
  for (const row of candidateRows) {
    let applicableRelations: Relation[] = [];
    if (randomRelation) {
      applicableRelations = relations.filter(r => r.tableId === row.tableId && r.modes.some(m => selectedModes.includes(m)));
    } else {
      applicableRelations = relations.filter(r => selectedRelationIds.includes(r.id) && r.tableId === row.tableId);
    }
    
    if (applicableRelations.length > 0) {
      const relation = applicableRelations[Math.floor(Math.random() * applicableRelations.length)];
      potentialQuestionStubs.push({ row, relation });
    }
  }

  const questionPool: StudyQuestion[] = [];
  let modeCycleIndex = 0;

  for (const { row, relation } of potentialQuestionStubs) {
      let mode: StudyMode | null = null;
      const compatibleModes = relation.modes.filter(m => selectedModes.includes(m));
      if (compatibleModes.length === 0) continue;

      if (randomizeModes) {
          mode = compatibleModes[Math.floor(Math.random() * compatibleModes.length)];
      } else {
          const initialModeIndex = modeCycleIndex;
          do {
              const candidateMode = selectedModes[modeCycleIndex % selectedModes.length];
              if (compatibleModes.includes(candidateMode)) {
                  mode = candidateMode;
              }
              modeCycleIndex++;
          } while (mode === null && modeCycleIndex < initialModeIndex + selectedModes.length);
      }
      
      if (!mode) mode = compatibleModes[0];

      const question = createQuestionFromStub(row, relation, mode, tables);
      if (question) {
        questionPool.push(question);
      }
  }
  
  return shuffle(questionPool);
};