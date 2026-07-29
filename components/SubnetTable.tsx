'use client';

import { useMemo, useState } from 'react';

export interface SubnetTableColumn<T> {
  key: string;
  label: string;
  accessor: (row: T) => string | number;
  numeric?: boolean;
}

interface SubnetTableProps<T> {
  columns: SubnetTableColumn<T>[];
  rows: T[];
  filterPlaceholder?: string;
}

export default function SubnetTable<T>({ columns, rows, filterPlaceholder }: SubnetTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const needle = filter.toLowerCase();
    return rows.filter((row) => columns.some((col) => String(col.accessor(row)).toLowerCase().includes(needle)));
  }, [rows, filter, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      const cmp = col.numeric ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir, columns]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {filterPlaceholder && (
        <input
          className="force-ltr max-w-xs rounded-md px-3 py-1.5 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={filterPlaceholder}
        />
      )}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr style={{ backgroundColor: 'var(--bg)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none border-b px-3 py-2 text-start font-medium"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {col.label}
                  {sortKey === col.key && <span className="ms-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr key={idx} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                {columns.map((col) => (
                  <td key={col.key} className="force-ltr px-3 py-2 font-mono">
                    {col.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
