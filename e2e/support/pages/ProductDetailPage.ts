import type { Page, Locator } from "@playwright/test";

export type BubbleColor = "green" | "yellow" | "red";

export class ProductDetailPage {
  constructor(private readonly page: Page) {}

  async goto(productId: string) {
    await this.page.goto(`/products/${productId}`);
  }

  productHeading(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  ratingBubble(dietProfileName: string): Locator {
    return this.page.locator("button.bubble", { hasText: dietProfileName });
  }

  async cycleRating(dietProfileName: string) {
    await this.ratingBubble(dietProfileName).click();
  }
}
