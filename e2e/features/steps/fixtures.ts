import { test as bddBase, createBdd } from "playwright-bdd";
import { LoginPage } from "../../support/pages/LoginPage";
import { DietProfilesPage } from "../../support/pages/DietProfilesPage";
import { ProductDetailPage } from "../../support/pages/ProductDetailPage";

export type SeededCatalog = {
  product?: { id: string; name: string };
  dietProfile?: { id: string; name: string };
  /** Unique name used by the Diet profile create scenario. */
  createdDietProfileName?: string;
};

type Fixtures = {
  loginPage: LoginPage;
  dietProfilesPage: DietProfilesPage;
  productDetailPage: ProductDetailPage;
  /** Mutable per-scenario seed bag for API fixtures. */
  seeded: SeededCatalog;
};

export const test = bddBase.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dietProfilesPage: async ({ page }, use) => {
    await use(new DietProfilesPage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  seeded: async ({}, use) => {
    await use({});
  },
});

export const { Given, When, Then } = createBdd(test);
