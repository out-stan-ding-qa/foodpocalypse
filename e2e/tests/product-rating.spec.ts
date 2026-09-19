import { test, expect } from "../support/fixtures";
import { createDietProfile, createProduct, setProductRating } from "../support/api";

test.describe("Product detail Rating cycle", () => {
  test("cycles Rating green → yellow → red → clear → blank", async ({
    request,
    productDetailPage,
  }) => {
    const product = await createProduct(request, { name: "E2E Rating Yogurt" });
    const dietProfile = await createDietProfile(request, {
      name: `E2E Rating Profile ${Date.now()}`,
      nutrients: ["proteins"],
    });
    await setProductRating(request, product.id, dietProfile.id, "green");

    await productDetailPage.goto(product.id);
    await expect(productDetailPage.productHeading(product.name)).toBeVisible();

    const bubble = productDetailPage.ratingBubble(dietProfile.name);
    await expect(bubble).toHaveClass(/green/);

    await productDetailPage.cycleRating(dietProfile.name);
    await expect(bubble).toHaveClass(/yellow/);

    await productDetailPage.cycleRating(dietProfile.name);
    await expect(bubble).toHaveClass(/red/);

    await productDetailPage.cycleRating(dietProfile.name);
    await expect(productDetailPage.ratingBubble(dietProfile.name)).toHaveCount(0);
  });
});
