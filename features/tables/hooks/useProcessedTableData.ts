import * as React from 'react';
import { VocabRow, Filter, Sort } from '../../../types';
import { useTableView } from '../contexts/TableViewContext';

interface UseProcessedTableDataProps {
  rows: VocabRow[];
}

const getSortValue = (row: VocabRow, key: string): string | number => {
    if (key.startsWith('stat:')) {
      const statKey = key.split(':')[1];
      const stats = row.stats;
      switch (statKey) {
        case 'successRate': const encounters = stats.correct + stats.incorrect; return encounters > 0 ? (stats.correct / encounters) * 100 : 0;
        case 'encounters': return stats.correct + stats.incorrect;
        case 'lastStudied': return stats.lastStudied || 0;
        default: return 0;
      }
    } else {
      return row.cols[key as string] || '';
    }
};

export const useProcessedTableData = ({ rows }: UseProcessedTableDataProps) => {
    const { state } = useTableView();
    const { filters, sorts, grouping } = state;

    const filteredRows = React.useMemo(() => {
        if (filters.length === 0) return rows;
        return rows.filter(row => filters.every(filter => {
            const cellValue = row.cols[filter.columnId] || '';
            const filterValue = filter.value;
            switch (filter.condition) {
                case 'contains': return cellValue.toLowerCase().includes(filterValue.toLowerCase());
                case 'does-not-contain': return !cellValue.toLowerCase().includes(filterValue.toLowerCase());
                case 'is': return cellValue === filterValue;
                case 'is-not': return cellValue !== filterValue;
                case 'is-empty': return !cellValue;
                case 'is-not-empty': return !!cellValue;
                default: return true;
            }
        }));
    }, [rows, filters]);

    const sortedRows = React.useMemo(() => {
        if (sorts.length === 0) return filteredRows;
        return [...filteredRows].sort((a, b) => {
            for (const sort of sorts) {
                const valA = getSortValue(a, sort.key);
                const valB = getSortValue(b, sort.key);
                let comparison = 0;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    comparison = valA - valB;
                } else {
                    comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                }
                if (comparison !== 0) {
                    return sort.direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }, [filteredRows, sorts]);
    
    const groupedRows = React.useMemo(() => {
        if (!grouping) return null;
        const groups = new Map<string, VocabRow[]>();
        const ungrouped: VocabRow[] = [];

        sortedRows.forEach(row => {
            const groupValue = row.cols[grouping.columnId] || '';
            if (groupValue) {
                if (!groups.has(groupValue)) groups.set(groupValue, []);
                groups.get(groupValue)!.push(row);
            } else {
                ungrouped.push(row);
            }
        });
        if (ungrouped.length > 0) groups.set('(empty)', ungrouped);
        return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    }, [sortedRows, grouping]);

    return { processedRows: sortedRows, groupedRows };
};
