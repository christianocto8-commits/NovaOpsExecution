import { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyMessage?: string;
};

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "No data available.",
}: DataTableProps<T>) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`border-b border-slate-200 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                    alignClass[column.align ?? "left"]
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70"
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-5 py-4 text-sm text-slate-700 ${
                        alignClass[column.align ?? "left"]
                      }`}
                    >
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}