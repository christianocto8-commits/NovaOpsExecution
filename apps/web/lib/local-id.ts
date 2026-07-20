/** Works on HTTP VPS (non-secure context) where crypto.randomUUID throws. */
export function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // Non-secure context (e.g. http://103.247.10.145)
    }
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
