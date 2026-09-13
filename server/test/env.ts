import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.JWT_SECRET = "test-jwt-secret-which-is-long-enough";
process.env.EMAIL_PEPPER = "test-email-pepper-value";
process.env.SQLITE_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "fp-test-")),
  "test.sqlite",
);
process.env.NODE_ENV = "test";
process.env.APP_ENV = "test";
process.env.DEFAULT_USER_EMAIL = "owner@foodpocalypse.local";
process.env.DEFAULT_USER_PASSWORD = "correct-horse";
