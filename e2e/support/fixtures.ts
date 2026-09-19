import { test as base } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { DietProfilesPage } from "./pages/DietProfilesPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";

type Pages = {
  loginPage: LoginPage;
  dietProfilesPage: DietProfilesPage;
  productDetailPage: ProductDetailPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dietProfilesPage: async ({ page }, use) => {
    await use(new DietProfilesPage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
});

export { expect } from "@playwright/test";
