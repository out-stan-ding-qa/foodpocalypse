export function isValidStoreLocation(location: string): boolean {
  const trimmed = location.trim();
  if (!trimmed) {
    return false;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return /^https?:\/\//i.test(trimmed);
  }
  return true;
}
