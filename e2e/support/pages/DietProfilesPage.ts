import type { Page, Locator } from "@playwright/test";

export class DietProfilesPage {
  readonly nameInput: Locator;
  readonly addSubmit: Locator;
  readonly error: Locator;

  constructor(private readonly page: Page) {
    this.nameInput = page.getByPlaceholder("e.g. Celiac / Gluten-Free");
    this.addSubmit = page.getByRole("button", { name: "Add Diet profile" });
    this.error = page.locator("p.error");
  }

  async goto() {
    await this.page.goto("/diet-profiles");
  }

  async create(name: string) {
    await this.nameInput.fill(name);
    await this.addSubmit.click();
  }

  profileHeading(name: string): Locator {
    return this.page.getByRole("heading", { name, exact: true });
  }
}
