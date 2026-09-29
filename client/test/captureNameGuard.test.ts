import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldShowNameConflictWarning } from "../src/domain/captureNameGuard.ts";

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function isNameUnique(draftName: string, catalog: Array<{ name: string }>): boolean {
  const key = normalizeName(draftName);
  if (!key) {
    return false;
  }
  return !catalog.some((product) => normalizeName(product.name) === key);
}

describe("shouldShowNameConflictWarning", () => {
  it("does not warn after a successful first-time save of a new name", () => {
    // Catalog refresh after save includes the Product just created.
    const catalogAfterSave = [{ name: "Oatly Vanilla" }];
    const draftStillFilled = "Oatly Vanilla";
    const nameUnique = isNameUnique(draftStillFilled, catalogAfterSave);
    assert.equal(nameUnique, false);
    assert.equal(
      shouldShowNameConflictWarning({ nameUnique, saveSucceeded: true }),
      false,
    );
  });

  it("warns while editing when the catalog already has that name", () => {
    const catalog = [{ name: "Oatly Vanilla" }];
    const nameUnique = isNameUnique("Oatly Vanilla", catalog);
    assert.equal(
      shouldShowNameConflictWarning({ nameUnique, saveSucceeded: false }),
      true,
    );
  });

  it("does not warn for a unique draft name before save", () => {
    const catalog = [{ name: "Other Product" }];
    const nameUnique = isNameUnique("Oatly Vanilla", catalog);
    assert.equal(
      shouldShowNameConflictWarning({ nameUnique, saveSucceeded: false }),
      false,
    );
  });
});
