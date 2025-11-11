// This is a test file for a framework like Jest or Vitest.
// A test runner needs to be configured in the project to execute these tests.

declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;

// Mock global test functions if they don't exist, for robustness.
if (typeof describe === 'undefined') { (globalThis as any).describe = (name: string, fn: () => void) => fn(); }
if (typeof it === 'undefined') { (globalThis as any).it = (name: string, fn: () => void) => fn(); }
if (typeof expect === 'undefined') {
    const customExpect = (actual: any) => ({
        toBe: (expected: any) => {
            if (actual !== expected) throw new Error(`TEST FAILED: Expected ${actual} to be ${expected}`);
        },
        toEqual: (expected: any) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        },
        toBeGreaterThanOrEqual: (expected: number) => {
             if (actual < expected) throw new Error(`TEST FAILED: Expected ${actual} to be >= ${expected}`);
        },
        toContain: (expected: any) => {
             if (!actual.includes(expected)) throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
        },
        not: {
            toBe: (expected: any) => {
                if (actual === expected) throw new Error(`TEST FAILED: Expected ${actual} not to be ${expected}`);
            }
        },
        toHaveLength: (expected: number) => {
            if (actual.length !== expected) throw new Error(`TEST FAILED: Expected length to be ${expected}, but got ${actual.length}`);
        },
    });
    (globalThis as any).expect = (actual: any) => {
        const matchers = customExpect(actual);
        if (actual instanceof Set) {
            (matchers as any).has = (expected: any) => {
                if (actual.has(expected) !== true) {
                    throw new Error(`TEST FAILED: Expected Set to have value ${expected}`);
                }
                return {
                    toBe: (bool: boolean) => {
                        if (actual.has(expected) !== bool) {
                            throw new Error(`TEST FAILED: Expected Set.has(${expected}) to be ${bool}`);
                        }
                    }
                }
            }
        }
        return matchers;
    };
}


import { generateStudySession, regenerateQuestionForRow, generateScrambleSession } from '../utils/studySessionGenerator';
import { Table, StudySettings, StudyMode, VocabRow, FlashcardStatus, Question } from '../types';

// Mock Data
const mockTable: Table = {
    id: 't1',
    name: 'Test Table',
    columns: [
        { id: 'c1', name: 'Word' },
        { id: 'c2', name: 'Definition' },
        { id: 'c3', name: 'Sentence' },
    ],
    rows: Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        cols: {
            'c1': `Word ${i}`,
            'c2': `Definition ${i}`,
            'c3': `Sentence containing word ${i}.`,
        },
        stats: {
            correct: i,
            incorrect: 10 - i,
            lastStudied: Date.now() - (10 - i) * 1000 * 3600 * 24, // r0 is oldest (10 days ago), r9 is newest (1 day ago)
            flashcardStatus: FlashcardStatus.New,
            flashcardEncounters: 0,
            isFlashcardReviewed: false,
            lastPracticeDate: null,
        },
    })),
    relations: [
        { id: 'rel1', name: 'Word -> Def', questionColumnIds: ['c1'], answerColumnIds: ['c2'], compatibleModes: [StudyMode.MultipleChoice, StudyMode.Typing] },
        { id: 'rel2', name: 'Def -> Word', questionColumnIds: ['c2'], answerColumnIds: ['c1'], compatibleModes: [StudyMode.MultipleChoice, StudyMode.Typing] },
        { id: 'rel3', name: 'Sentence Scramble', questionColumnIds: ['c3'], answerColumnIds: [], compatibleModes: [StudyMode.Scrambled] },
    ],
};

const mockTables = [mockTable];

describe('studySessionGenerator', () => {

    describe('generateStudySession', () => {
        it('should generate the correct number of questions', () => {
            const settings: StudySettings = {
                type: 'table',
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'auto',
                wordCount: 5,
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions.length).toBe(5);
        });

        it('should only generate questions of the selected modes', () => {
            const settings: StudySettings = {
                type: 'table',
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'auto',
                wordCount: 5,
            };
            const questions = generateStudySession(mockTables, settings);
            questions.forEach(q => {
                expect(q.type).toBe(StudyMode.Typing);
            });
        });

        it('should handle manual word selection', () => {
            const settings: StudySettings = {
                type: 'table',
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'manual',
                manualWordIds: ['r1', 'r3', 'r5'],
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions.length).toBe(3);
            const questionRowIds = new Set(questions.map(q => q.rowId));
            expect(questionRowIds.has('r1')).toBe(true);
            expect(questionRowIds.has('r3')).toBe(true);
            expect(questionRowIds.has('r5')).toBe(true);
        });

        it('should generate multiple choice questions with options', () => {
             const settings: StudySettings = {
                type: 'table',
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.MultipleChoice],
                wordSelectionMode: 'auto',
                wordCount: 1,
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions[0].type).toBe(StudyMode.MultipleChoice);
            expect(questions[0].options?.length).toBeGreaterThanOrEqual(2);
            expect(questions[0].options).toContain(questions[0].correctAnswer);
        });
        
        it('should respect criteria-based sorting (lastStudied)', () => {
            const settings: StudySettings = {
                type: 'criteria',
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'auto',
                wordCount: 3,
                criteriaSorts: [{ field: 'lastStudied', direction: 'asc' }],
            };
            // `lastStudied` is older for lower index `i`. So we expect r0, r1, r2.
            const questions = generateStudySession(mockTables, settings);
            const questionRowIds = questions.map(q => q.rowId);
            
            // The final list is shuffled, so we check if the generated questions are from the correct pool.
            const topThreeLeastRecent = ['r0', 'r1', 'r2'];
            questionRowIds.forEach(id => {
                expect(topThreeLeastRecent.includes(id)).toBe(true);
            });
        });

        it('should return an empty array if no compatible modes are found', () => {
            const settings: StudySettings = {
                type: 'table',
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Scrambled], // rel1 is not compatible with Scrambled
                wordSelectionMode: 'auto',
                wordCount: 5,
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions).toEqual([]);
        });

    });

    describe('regenerateQuestionForRow', () => {
        it('should generate a new question for the same row', () => {
            const allRows = mockTable.rows;
            const settings: StudySettings = {
                 type: 'table',
                 sources: [{ tableId: 't1', relationId: 'rel1' }],
                 modes: [StudyMode.Typing, StudyMode.MultipleChoice],
                 randomizeModes: true,
                 wordSelectionMode: 'auto',
                 wordCount: 1,
            };
            const originalQuestion: Question = {
                rowId: 'r1',
                tableId: 't1',
                relationId: 'rel1',
                questionSourceColumnNames: ['Word'],
                questionText: 'Word 1',
                correctAnswer: 'Definition 1',
                type: StudyMode.Typing,
            };

            const newQuestion = regenerateQuestionForRow(originalQuestion, allRows, mockTables, settings);
            expect(newQuestion).not.toBeNull();
            expect(newQuestion.rowId).toBe('r1');
            // It could be the same type, but it should be a new object.
            expect(newQuestion).not.toBe(originalQuestion);
        });
    });

    describe('generateScrambleSession', () => {
        it('should generate scramble questions with shuffled parts', () => {
            const settings = {
                sources: [{ tableId: 't1', relationId: 'rel3' }],
                splitCount: 4,
                interactionMode: 'click' as const,
            };

            const questions = generateScrambleSession(mockTables, settings);
            expect(questions.length).toBe(10); // All 10 rows have sentences with >= 4 words.
            const q1 = questions.find(q => q.rowId === 'r0');
            expect(q1?.originalSentence).toBe('Sentence containing word 0.');
            expect(q1?.scrambledParts.length).toBe(4);
            // Check if parts are correct, regardless of order
            expect(q1?.scrambledParts.sort()).toEqual(['Sentence', 'containing', 'word', '0.'].sort());
        });
    });
});