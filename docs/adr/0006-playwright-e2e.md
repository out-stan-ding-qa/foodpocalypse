# Playwright E2E for the Vue UI layer

Browser end-to-end tests live in a top-level `e2e/` workspace and cover only the thin Vue UI. Domain rules stay in `server/` unit and HTTP integration tests. Chromium only. Specs use a dedicated ephemeral SQLite test DB, not the developer's everyday local DB.

## Decision

- **Workspace:** `e2e/` with its own `package.json`, `playwright.config.ts`, and `tsconfig.json`. Root adds the workspace and a `test:e2e` script.
- **Layout:** `features/*.feature` (Gherkin) + `features/steps/` (playwright-bdd); `tests/auth.setup.ts`; `support/api.ts`, `support/auth.ts`; `support/pages/` Page Objects from day one (`LoginPage`, `DietProfilesPage`, `ProductDetailPage`). Generated specs live under `e2e/.features-gen/` (gitignored). `e2e/.auth/user.json` is gitignored (`storageState`).
- **Readable scenarios:** Feature files are the source of truth for UI behavior; step defs call Page Objects and API helpers. Domain vocabulary follows `CONTEXT.md` (User, Email, Password, Diet profile, Product, Rating, Recommendation).
- **Auth & data:** Setup project signs in once and writes `storageState`. Specs that need catalog or diet state seed via HTTP API helpers (Product, Diet profile). No Recommendation fixture in the first suite.
- **First specs (isolated):** sign-in UI; create Diet profile UI; Rating cycle green → yellow → red → clear → blank on Product detail with API-seeded Product + Diet profile.
- **Boot:** CI runs a one-port production stack (`npm run build` + `npm start` on `:3001`). Locally, Vite on `:5173` (API proxied to `127.0.0.1:3001`). The e2e webServer always sets `PORT=3001` and does not inherit `process.env.PORT`. `reuseExistingServer` only when `E2E_REUSE=1` **and** `E2E_SQLITE_PATH` is set to the sqlite file that already-running server uses; otherwise Playwright starts its own webServer. Never reuse against the everyday local DB.
- **Unique Diet profile names:** UI create and API-seeded Rating fixtures append a timestamp so reruns against a leftover e2e sqlite do not collide on headings.
- **CI sequencing (separate work):** land `npm test` (± client build) in GitHub Actions first; add a Playwright job only after the `e2e/` package exists.

## Considered Options

- Co-locate Playwright under `client/` — rejected; keeps UI unit/Vite concerns mixed with browser harness and root scripts
- Fixture + API helpers only, introduce Page Objects later — rejected; first PR still needs shared sign-in / Diet profile / Product detail controls, and Page Objects keep the framework extensible
- Always `reuseExistingServer` locally — rejected; attaches to everyday SQLite and pollutes real data
- Never reuse locally — acceptable but slower (~3–10s cold start per run); opt-in reuse is enough
- Same boot mode everywhere (always prod or always Vite) — rejected; CI should match production origin; local DX stays on Vite
- Playwright-only `.spec.ts` without Gherkin — rejected after first suite; feature files are easier to read and extend while steps keep Page Objects + API helpers
