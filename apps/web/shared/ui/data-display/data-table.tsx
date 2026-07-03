import { ReactNode } from "react";
import { EmptyState } from "@/shared/ui/feedback";
import { LoadingSkeleton } from "@/shared/ui/feedback";
import { cn } from "@/lib/cn";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  emptyTitle = "No data found",
  emptyDescription = "There are no records to display yet.",
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton className="h-10 w-full" />
        <LoadingSkeleton className="h-16 w-full" />
        <LoadingSkeleton className="h-16 w-full" />
        <LoadingSkeleton className="h-16 w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#E7ECE9] bg-white",
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[#F7FAF8] text-xs uppercase tracking-wide text-gray-500">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-5 py-4 font-semibold", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E7ECE9]">
            {data.map((row) => (
              <tr key={getRowKey(row)} className="hover:bg-[#F7FAF8]">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-5 py-4 text-gray-700", column.className)}
                  >
                    {column.cell(row)}
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