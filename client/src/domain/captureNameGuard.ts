/**
 * Whether Capture should show the hard name-conflict warning.
 * After a successful save, the catalog includes the just-saved Product while
 * the draft name is still filled in — that must not look like a conflict.
 */
export function shouldShowNameConflictWarning(opts: {
  nameUnique: boolean;
  saveSucceeded: boolean;
}): boolean {
  if (opts.saveSucceeded) {
    return false;
  }
  return !opts.nameUnique;
}
