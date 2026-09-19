import { test, expect } from "../support/fixtures";
import { E2E_USER } from "../support/auth";

test.describe("sign-in UI", () => {
  test("signs in with Email and Password and lands on Home", async ({
    page,
    loginPage,
  }) => {
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
    await loginPage.signIn(E2E_USER.email, E2E_USER.password);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /Hello,/ })).toBeVisible();
  });
});
