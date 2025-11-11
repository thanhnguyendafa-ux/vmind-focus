import * as React from 'react';
import { Filter, Sort, VocabRow, Column } from '../../../types';

// State interface
interface TableViewState {
  filters: Filter[];
  sorts: Sort[];
  grouping: { columnId: string } | null;
  selectedRows: Set<string>;
  visibleColumns: Set<string>;
  visibleStats: Set<string>;
  currentPage: number;
  columnWidths: Record<string, number>;
  rowHeight: 'short' | 'medium' | 'tall';
  isTextWrapEnabled: boolean;
}

// Action types
type Action =
  | { type: 'SET_FILTERS'; payload: Filter[] }
  | { type: 'SET_SORTS'; payload: Sort[] }
  | { type: 'SET_GROUPING'; payload: { columnId: string } | null }
  | { type: 'TOGGLE_ROW_SELECTION'; payload: string }
  | { type: 'SET_SELECTED_ROWS'; payload: Set<string> }
  | { type: 'SET_VISIBLE_COLUMNS'; payload: Set<string> }
  | { type: 'SET_VISIBLE_STATS'; payload: Set<string> }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'RESET_VIEW'; payload: { columns: Column[] } }
  | { type: 'INITIALIZE_VIEW_SETTINGS'; payload: Partial<Pick<TableViewState, 'columnWidths' | 'rowHeight' | 'isTextWrapEnabled'>> }
  | { type: 'SET_COLUMN_WIDTH'; payload: { columnId: string; width: number } }
  | { type: 'SET_ROW_HEIGHT'; payload: 'short' | 'medium' | 'tall' }
  | { type: 'SET_TEXT_WRAP'; payload: boolean };

// Reducer
const tableViewReducer = (state: TableViewState, action: Action): TableViewState => {
  switch (action.type) {
    case 'SET_FILTERS':
      return { ...state, filters: action.payload, currentPage: 1, selectedRows: new Set() };
    case 'SET_SORTS':
      return { ...state, sorts: action.payload, currentPage: 1 };
    case 'SET_GROUPING':
        return { ...state, grouping: action.payload, currentPage: 1 };
    case 'TOGGLE_ROW_SELECTION': {
      const newSelectedRows = new Set(state.selectedRows);
      if (newSelectedRows.has(action.payload)) {
        newSelectedRows.delete(action.payload);
      } else {
        newSelectedRows.add(action.payload);
      }
      return { ...state, selectedRows: newSelectedRows };
    }
    case 'SET_SELECTED_ROWS':
      return { ...state, selectedRows: action.payload };
    case 'SET_VISIBLE_COLUMNS':
      return { ...state, visibleColumns: action.payload };
    case 'SET_VISIBLE_STATS':
      return { ...state, visibleStats: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'RESET_VIEW':
      return {
        filters: [],
        sorts: [],
        grouping: null,
        selectedRows: new Set(),
        visibleColumns: new Set(action.payload.columns.map(c => c.id)),
        visibleStats: new Set(),
        currentPage: 1,
        columnWidths: {},
        rowHeight: 'medium',
        isTextWrapEnabled: false,
      };
    case 'INITIALIZE_VIEW_SETTINGS':
        return { ...state, ...action.payload };
    case 'SET_COLUMN_WIDTH':
      return {
        ...state,
        columnWidths: {
          ...state.columnWidths,
          [action.payload.columnId]: action.payload.width,
        },
      };
    case 'SET_ROW_HEIGHT':
      return { ...state, rowHeight: action.payload };
    case 'SET_TEXT_WRAP':
      return { ...state, isTextWrapEnabled: action.payload };
    default:
      return state;
  }
};

// Context
const TableViewContext = React.createContext<{
  state: TableViewState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

// Provider
interface TableViewProviderProps {
  children: React.ReactNode;
  columns: Column[];
}

export const TableViewProvider: React.FC<TableViewProviderProps> = ({ children, columns }) => {
  const initialState: TableViewState = {
    filters: [],
    sorts: [],
    grouping: null,
    selectedRows: new Set(),
    visibleColumns: new Set(columns.map(c => c.id)),
    visibleStats: new Set(),
    currentPage: 1,
    columnWidths: {},
    rowHeight: 'medium',
    isTextWrapEnabled: false,
  };
  const [state, dispatch] = React.useReducer(tableViewReducer, initialState);
  
  // Effect to reset state if the columns change (i.e., table changes)
  React.useEffect(() => {
    dispatch({ type: 'RESET_VIEW', payload: { columns } });
  }, [columns]);

  return (
    <TableViewContext.Provider value={{ state, dispatch }}>
      {children}
    </TableViewContext.Provider>
  );
};

// Hook
export const useTableView = () => {
  const context = React.useContext(TableViewContext);
  if (context === undefined) {
    throw new Error('useTableView must be used within a TableViewProvider');
  }
  return context;
};