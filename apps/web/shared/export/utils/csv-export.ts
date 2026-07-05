type ExportCsvParams<T extends Record<string, string | number>> = {
  fileName: string;
  rows: T[];
};

export function exportToCsv<T extends Record<string, string | number>>(
  paramsOrRows: ExportCsvParams<T> | T[],
  legacyFileName?: string
) {
  const rows = Array.isArray(paramsOrRows) ? paramsOrRows : paramsOrRows.rows;
  const fileName = Array.isArray(paramsOrRows)
    ? (legacyFileName ?? "novaops-export")
    : paramsOrRows.fileName;

  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${fileName}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
