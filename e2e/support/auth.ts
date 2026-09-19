import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));

/** Playwright storageState path (gitignored). */
export const AUTH_FILE = path.join(e2eDir, "..", ".auth", "user.json");

/** User credentials for e2e auth.setup and sign-in. */
export const E2E_USER = {
  email: "e2e@foodpocalypse.test",
  password: "e2e-correct-horse",
} as const;
