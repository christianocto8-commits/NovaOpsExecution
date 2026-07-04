type DataTableEmptyStateProps = {
  title?: string;
  description?: string;
  colSpan: number;
};

export function DataTableEmptyState({
  title = "No data found",
  description = "Try adjusting your search or filter criteria.",
  colSpan,
}: DataTableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-14 text-center">
        <div className="mx-auto max-w-sm">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </td>
    </tr>
  );
}
