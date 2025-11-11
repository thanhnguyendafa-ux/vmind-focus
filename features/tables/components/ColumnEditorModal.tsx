import * as React from 'react';
import { Column } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';

interface ColumnEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: Column[];
  onSave: (newColumns: Column[]) => void;
}

const ColumnEditorModal: React.FC<ColumnEditorModalProps> = ({ isOpen, onClose, columns, onSave }) => {
  const [editableColumns, setEditableColumns] = React.useState<Column[]>([]);
  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setEditableColumns(JSON.parse(JSON.stringify(columns))); // Deep copy
    }
  }, [isOpen, columns]);

  const handleUpdateName = (id: string, name: string) => {
    setEditableColumns(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleAddColumn = () => {
    const newCol: Column = { id: crypto.randomUUID(), name: 'New Column' };
    setEditableColumns(prev => [...prev, newCol]);
  };

  const handleDeleteColumn = (id: string) => {
    setEditableColumns(prev => prev.filter(c => c.id !== id));
  };

  const handleDragSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newColumns = [...editableColumns];
    const dragItemContent = newColumns.splice(dragItem.current, 1)[0];
    newColumns.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setEditableColumns(newColumns);
  };
  
  const handleSave = () => {
    onSave(editableColumns);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Columns">
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">Add, rename, delete, or reorder columns. Changes will affect all rows and relations.</p>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {editableColumns.map((col, index) => (
            <div 
              key={col.id} 
              className="flex items-center gap-2 p-1 rounded-md bg-white dark:bg-slate-800"
              draggable
              onDragStart={() => dragItem.current = index}
              onDragEnter={() => dragOverItem.current = index}
              onDragEnd={handleDragSort}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="cursor-move text-slate-400 p-1">
                <Icon name="drag-handle" className="w-5 h-5"/>
              </div>
              <input
                type="text"
                value={col.name}
                onChange={e => handleUpdateName(col.id, e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
              />
              <button onClick={() => handleDeleteColumn(col.id)} className="p-2 text-slate-400 hover:text-red-500">
                <Icon name="trash" className="w-5 h-5"/>
              </button>
            </div>
          ))}
        </div>
        <button onClick={handleAddColumn} className="text-sm font-semibold text-emerald-600 dark:text-emerald-500 hover:underline flex items-center gap-1">
          <Icon name="plus" className="w-4 h-4"/> Add Column
        </button>
      </div>
      <footer className="p-4 bg-slate-100 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
        <button onClick={onClose} className="bg-white dark:bg-slate-700 font-semibold px-4 py-2 rounded-md border">Cancel</button>
        <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Save Columns</button>
      </footer>
    </Modal>
  );
};

export default ColumnEditorModal;