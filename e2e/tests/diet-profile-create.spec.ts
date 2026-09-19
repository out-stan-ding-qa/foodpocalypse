import { test, expect } from "../support/fixtures";

test.describe("create Diet profile UI", () => {
  test("creates a Diet profile from the form", async ({ dietProfilesPage }) => {
    const name = `E2E Profile ${Date.now()}`;
    await dietProfilesPage.goto();
    await dietProfilesPage.create(name);
    await expect(dietProfilesPage.profileHeading(name)).toBeVisible();
  });
});
