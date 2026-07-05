export function createDataTableStorageKey(title: string, storageKey?: string) {
  return `novaops:data-table:${storageKey ?? title.toLowerCase().replace(/\s+/g, "-")}:views`;
}
