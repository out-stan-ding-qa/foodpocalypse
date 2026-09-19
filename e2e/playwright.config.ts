import { defineConfig, devices } from "@playwright/test";
import { defineBddProject } from "playwright-bdd";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTH_FILE } from "./support/auth";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "..");
const isCI = Boolean(process.env.CI);
const reuseLocal = !isCI && process.env.E2E_REUSE === "1";

if (reuseLocal && !process.env.E2E_SQLITE_PATH) {
  throw new Error(
    "E2E_REUSE=1 requires E2E_SQLITE_PATH to be set to the sqlite file the already-running server was started with. Playwright cannot apply SQLITE_PATH when reusing an existing process, so omitting the path would attach to the everyday local DB.",
  );
}

const e2eSqlite =
  process.env.E2E_SQLITE_PATH ?? path.join(os.tmpdir(), "fp-e2e", "e2e.sqlite");
fs.mkdirSync(path.dirname(e2eSqlite), { recursive: true });
fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

const e2eEnv: Record<string, string> = {
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET || "e2e-jwt-secret-which-is-long-enough",
  EMAIL_PEPPER: process.env.EMAIL_PEPPER || "e2e-email-pepper-long-enough",
  SQLITE_PATH: e2eSqlite,
  // Pin 3001: Vite's /api proxy targets 127.0.0.1:3001. Do not inherit process.env.PORT.
  PORT: "3001",
  // Avoid seeding a DEFAULT_USER; auth.setup registers the e2e User.
  DEFAULT_USER_EMAIL: "",
  DEFAULT_USER_PASSWORD: "",
};

const baseURL = isCI ? "http://localhost:3001" : "http://localhost:5173";

const chrome = devices["Desktop Chrome"];

export default defineConfig({
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 1,
  // HTML reporter disabled until KAN-16. Do not add "html" here.
  reporter: isCI ? [["github"], ["list"]] : "list",
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testDir: path.join(e2eDir, "tests"),
      testMatch: /auth\.setup\.ts/,
    },
    {
      ...defineBddProject({
        name: "chromium",
        features: "features/*.feature",
        steps: "features/steps/*.ts",
        tags: "@authenticated",
      }),
      dependencies: ["setup"],
      use: {
        ...chrome,
        storageState: AUTH_FILE,
      },
    },
    {
      ...defineBddProject({
        name: "chromium-anon",
        features: "features/*.feature",
        steps: "features/steps/*.ts",
        tags: "@anon",
      }),
      // setup inserts the e2e User; this project then uses empty storageState so sign-in is UI-only.
      dependencies: ["setup"],
      use: {
        ...chrome,
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
