import { expect } from "@playwright/test";
import { createDietProfile, createProduct, setProductRating } from "../../support/api";
import { E2E_USER } from "../../support/auth";
import { Given, When, Then } from "./fixtures";

Given("I am on the sign-in page", async ({ loginPage }) => {
  await loginPage.goto();
  await expect(loginPage.heading).toBeVisible();
});

When("I sign in with the e2e User Email and Password", async ({ loginPage }) => {
  await loginPage.signIn(E2E_USER.email, E2E_USER.password);
});

Then("I am on Home", async ({ page }) => {
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: /Hello,/ })).toBeVisible();
});

Given("I am on the Diet profiles page", async ({ dietProfilesPage }) => {
  await dietProfilesPage.goto();
});

When(
  "I create a Diet profile named {string}",
  async ({ dietProfilesPage }, name: string) => {
    await dietProfilesPage.create(name);
  },
);

Then(
  "I see the Diet profile named {string}",
  async ({ dietProfilesPage }, name: string) => {
    await expect(dietProfilesPage.profileHeading(name)).toBeVisible();
  },
);

Given(
  "an API-seeded Product with an active Diet profile and a green Rating",
  async ({ request, seeded }) => {
    const product = await createProduct(request, { name: "E2E Rating Yogurt" });
    const dietProfile = await createDietProfile(request, {
      name: `E2E Rating Profile ${Date.now()}`,
      nutrients: ["proteins"],
    });
    await setProductRating(request, product.id, dietProfile.id, "green");
    seeded.product = product;
    seeded.dietProfile = dietProfile;
  },
);

When("I open that Product detail", async ({ productDetailPage, seeded }) => {
  if (!seeded.product) {
    throw new Error("Product was not seeded");
  }
  await productDetailPage.goto(seeded.product.id);
  await expect(productDetailPage.productHeading(seeded.product.name)).toBeVisible();
});

Then(
  "I see a green Rating bubble for the Diet profile",
  async ({ productDetailPage, seeded }) => {
    if (!seeded.dietProfile) {
      throw new Error("Diet profile was not seeded");
    }
    await expect(productDetailPage.ratingBubble(seeded.dietProfile.name)).toHaveClass(
      /green/,
    );
  },
);

Then(
  "I see a yellow Rating bubble for the Diet profile",
  async ({ productDetailPage, seeded }) => {
    if (!seeded.dietProfile) {
      throw new Error("Diet profile was not seeded");
    }
    await expect(productDetailPage.ratingBubble(seeded.dietProfile.name)).toHaveClass(
      /yellow/,
    );
  },
);

Then(
  "I see a red Rating bubble for the Diet profile",
  async ({ productDetailPage, seeded }) => {
    if (!seeded.dietProfile) {
      throw new Error("Diet profile was not seeded");
    }
    await expect(productDetailPage.ratingBubble(seeded.dietProfile.name)).toHaveClass(
      /red/,
    );
  },
);

Then(
  "I see no Rating bubble for the Diet profile",
  async ({ productDetailPage, seeded }) => {
    if (!seeded.dietProfile) {
      throw new Error("Diet profile was not seeded");
    }
    await expect(productDetailPage.ratingBubble(seeded.dietProfile.name)).toHaveCount(0);
  },
);

When("I tap the Rating bubble", async ({ productDetailPage, seeded }) => {
  if (!seeded.dietProfile) {
    throw new Error("Diet profile was not seeded");
  }
  await productDetailPage.cycleRating(seeded.dietProfile.name);
});
