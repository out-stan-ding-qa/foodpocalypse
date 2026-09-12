import "./env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/auth/password.js";

describe("Password", () => {
  it("verifies a matching Password and rejects a wrong one", async () => {
    const passwordHash = await hashPassword("correct-horse-battery");
    assert.equal(await verifyPassword(passwordHash, "correct-horse-battery"), true);
    assert.equal(await verifyPassword(passwordHash, "wrong-password"), false);
  });
});
