import { StudySettings } from "../types";

export const defaultStudySettings: StudySettings = {
  studyMode: 'table',
  criteriaSorts: [{ column: 'Priority Score', direction: 'desc' }],
  selectedTableIds: [],
  selectedModes: [],
  randomizeModes: false,
  selectedRelationIds: [],
  randomRelation: false,
  isManualMode: false,
  manualWordIds: [],
  wordCount: 8,
  enableAccuracyGoal: false,
  accuracyGoal: 90,
  wordSelectionStrategy: 'holistic',
  perTableSorts: {},
  queueCompositionStrategy: 'balanced',
  tablePercentages: {},
};
