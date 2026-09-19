import type { Page, Locator } from "@playwright/test";

export type BubbleColor = "green" | "yellow" | "red";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class ProductDetailPage {
  constructor(private readonly page: Page) {}

  async goto(productId: string) {
    await this.page.goto(`/products/${productId}`);
  }

  productHeading(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }

  ratingBubble(dietProfileName: string, color?: BubbleColor): Locator {
    if (color) {
      return this.page.getByRole("button", {
        name: `${dietProfileName}, ${color} Rating`,
        exact: true,
      });
    }
    return this.page.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(dietProfileName)}, (green|yellow|red) Rating$`),
    });
  }

  addRatingChip(dietProfileName: string): Locator {
    return this.page.getByRole("button", {
      name: `Add Rating for ${dietProfileName}`,
      exact: true,
    });
  }

  async cycleRating(dietProfileName: string) {
    await this.ratingBubble(dietProfileName).click();
  }
}
