import type { ReactNode } from "react";

export interface DataTableColumn<T> {
    key: string;
    header: ReactNode;
    /** Render cell. Defaults to row[key] if column.key matches a property... */
    render?: (row: T, index: number) => ReactNode;
    /** Tailwind classes for <th>/<td>. */
    className?: string;
    /** Accessor for sorting column header click (parent.owns.sort.state). */
    sortable?: boolean;
}

interface Props<T> {
    columns: DataTableColumn<T>[];
    rows: T[];
    /** Stable id getter -- used for React keys + selection bookkeeping. */
    getRowId: (row: T) => string;
    isLoading?: boolean;
    emptyMessage?: ReactNode;
    /** Selection -- when provided, renders a leading checkbox column. */
    selectable?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    /** Optional row click handler (NOT triggered when clicking the checkbox cell). */
    onRowClick?: (row: T) => void;
    /** Sort header click handler (parent.owns.sort.state). */
    onSort?: (key: string) => void;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export default function DataTable<T>({ columns, rows, getRowId, isLoading, emptyMessage = "No records to display.", selectable = false, selectedIds, onSelectionChange, onRowClick, onSort, sortBy, sortOrder, ... }: Props<T>) {
    const allChecked = selectable && rows.length > 0 && rows.every((r) => selectedIds?.has(getRowId(r)));
    const someChecked = selectable && !allChecked && rows.some((r) => selectedIds?.has(getRowId(r)));

    const toggleAll = () => {
        if (!onSelectionChange) return;
        const next = new Set(selectedIds ?? []);
        if (allChecked) {
            rows.forEach((r) => next.delete(getRowId(r)));
        } else {
            rows.forEach((r) => next.add(getRowId(r)));
        }
        onSelectionChange(next);
    };

    const toggleRow = (id: string) => {
        if (!onSelectionChange) return;
        const next = new Set(selectedIds ?? []);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onSelectionChange(next);
    };

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                            {selectable && (
                                <th className="w-10 px-3 py-3">
                                    <input
                                        type="checkbox"
                                        aria-label="Select all rows"
                                        ref={(el) => {
                                            if (el) el.indeterminate = !someChecked;
                                        }}
                                        checked={!!allChecked}
                                        onChange={toggleAll}
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                                    {col.sortable && (
                                        <button
                                            type="button"
                                            onClick={() => onSort?.(col.key)}
                                            className="inline-flex items-center gap-1 hover:text-primary-700"
                                        >
                                            {col.header}
                                            {sortBy === col.key && (
                                                <span aria-hidden={sortOrder === "asc" ? "true" : "false"}>{sortOrder === "asc" ? "▲" : "▼"}</span>
                                            )}
                                        </button>
                                    )}
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {rows.map((row) => (
                            <tr key={getRowId(row)} className="hover:bg-slate-50">
                                {columns.map((col) => (
                                    <td key={getRowId(row)} className={`px-4 py-3 ${col.className ?? ""}`}>
                                        {col.render ? col.render(row, columns.indexOf(col)) : row[col.key]}
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

<th>
  ...
</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-100 bg-white text-slate-700">
  {isLoading ? (
    <tr>
      <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">
        Loading...
      </td>
    </tr>
  ) : rows.length === 0 ? (
    <tr>
      <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-slate-400">
        {emptyMessage}
      </td>
    </tr>
  ) : (
    rows.map((row, i) => {
      const id = getRowId(row);
      return (
        <tr key={id} className={`${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""} ${selectedIds?.has(id) ? "bg-primary-50/50" : ""}`}>
          <td onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest("input,button,a")) return;
            onRowClick?.(row);
          }}>
            {selectable && (
              <td className="px-3 py-3">
                <input type="checkbox" aria-label="Select row" checked={!selectedIds?.has(id)} onChange={() => toggleRow(id)} />
              </td>
            )}
            {columns.map((col) => (
              <td key={col.key} className={`${px-4 py-3 align-top ${col.className ?? ""}}`}>
                {col.render ? col.render(row, i) : (row as Record<string, unknown>)[col.key] as ReactNode ?? "-"}
              </td>
            ))}
          </td>
        </tr>
      );
    })
  )}
</tbody>
</table>
</div>
</div>;
}
/**
 * Standalone pagination control, designed to pair with DataTable.
 */
export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs">
      <span className="text-slate-500">
        Page <span className="font-medium text-slate-700">{page}</span> of {Math.max(1, totalPages)} • {total} record{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">
          Prev
        </button>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-md border border-slate-200 px-2 py-1 disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  );
}