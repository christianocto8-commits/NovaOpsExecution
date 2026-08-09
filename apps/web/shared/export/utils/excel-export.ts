type ExportExcelParams<T extends Record<string, string | number>> = {
  fileName: string;
  sheetName?: string;
  rows: T[];
};

function escapeHtml(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>())
  );
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${headers.map((header) => `<td>${escapeHtml(row[header] ?? "")}</td>`).join("")}</tr>`
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><caption>${escapeHtml(
    sheetName
  )}</caption><thead><tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${fileName}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
