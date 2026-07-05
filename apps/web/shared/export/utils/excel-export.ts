import * as XLSX from "xlsx";

type ExportExcelParams<T extends Record<string, string | number>> = {
  fileName: string;
  sheetName?: string;
  rows: T[];
};

export function exportToExcel<T extends Record<string, string | number>>(
  paramsOrRows: ExportExcelParams<T> | T[],
  legacyFileName?: string,
  legacySheetName = "NovaOPS"
) {
  const rows = Array.isArray(paramsOrRows) ? paramsOrRows : paramsOrRows.rows;
  const fileName = Array.isArray(paramsOrRows)
    ? (legacyFileName ?? "novaops-export")
    : paramsOrRows.fileName;
  const sheetName = Array.isArray(paramsOrRows)
    ? legacySheetName
    : (paramsOrRows.sheetName ?? "NovaOPS");

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}
