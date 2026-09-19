import { test as setup } from "@playwright/test";
import { ensureE2eUser } from "../support/api";
import { AUTH_FILE } from "../support/auth";

setup("authenticate via API", async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL });
  await ensureE2eUser(request);
  await request.storageState({ path: AUTH_FILE });
  await request.dispose();
});
