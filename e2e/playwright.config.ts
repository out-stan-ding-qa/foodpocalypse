import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTH_FILE } from "./support/auth";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "..");
const isCI = Boolean(process.env.CI);
const reuseLocal = !isCI && process.env.E2E_REUSE === "1";

const e2eSqlite =
  process.env.E2E_SQLITE_PATH ?? path.join(os.tmpdir(), "fp-e2e", "e2e.sqlite");
fs.mkdirSync(path.dirname(e2eSqlite), { recursive: true });
fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

const e2eEnv: Record<string, string> = {
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET || "e2e-jwt-secret-which-is-long-enough",
  EMAIL_PEPPER: process.env.EMAIL_PEPPER || "e2e-email-pepper-long-enough",
  SQLITE_PATH: e2eSqlite,
  PORT: process.env.PORT || "3001",
  // Avoid seeding a DEFAULT_USER; auth.setup registers the e2e User.
  DEFAULT_USER_EMAIL: "",
  DEFAULT_USER_PASSWORD: "",
};

const baseURL = isCI ? "http://localhost:3001" : "http://localhost:5173";

export default defineConfig({
  testDir: path.join(e2eDir, "tests"),
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      dependencies: ["setup"],
      testMatch: /diet-profile-create\.spec\.ts|product-rating\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: undefined,
        storageState: AUTH_FILE,
      },
    },
    {
      name: "chromium-anon",
      dependencies: ["setup"],
      testMatch: /sign-in\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  webServer: {
    command: isCI
      ? "npm run build && npm start"
      : 'npx concurrently -k -s first -n server,client -c blue,green "npm run dev -w server" "npm run dev -w client"',
    cwd: repoRoot,
    url: `${baseURL}/login`,
    reuseExistingServer: reuseLocal,
    timeout: isCI ? 300_000 : 120_000,
    env: isCI
      ? {
          ...e2eEnv,
          NODE_ENV: "production",
          APP_ENV: "production",
        }
      : {
          ...e2eEnv,
          APP_ENV: "local",
          NODE_ENV: "development",
        },
  },
});
