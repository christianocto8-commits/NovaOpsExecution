import * as XLSX from "xlsx";

export function exportToExcel<T extends Record<string, string | number>>({
  fileName,
  sheetName,
  rows,
}: {
  fileName: string;
  sheetName: string;
  rows: T[];
}) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}