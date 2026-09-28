/** Normalize a Product name for per-User uniqueness (trim, collapse space, case-fold). */
export function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
