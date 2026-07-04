export function filterRows<T extends Record<string, string | number>>(
  rows: T[],
  search: string
) {
  const keyword = search.toLowerCase().trim();

  if (!keyword) return rows;

  return rows.filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(keyword)
    )
  );
}
