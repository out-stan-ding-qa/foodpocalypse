import "./env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashEmail, isValidEmail, normalizeEmail } from "../src/auth/email.js";

describe("Email", () => {
  it("normalizes by trimming and lowercasing", () => {
    assert.equal(normalizeEmail("  User@Example.COM  "), "user@example.com");
  });

  it("rejects a value that is not an Email", () => {
    assert.equal(isValidEmail("not-an-email"), false);
    assert.equal(isValidEmail("user@example.com"), true);
  });

  it("hashes the normalized Email with the pepper", () => {
    assert.equal(
      hashEmail("  User@Example.COM  "),
      "02ba3adefa10ed2510a0b3c850f92cdf5ef02021fae1f148eaca8ead4cc4b81e",
    );
    assert.equal(hashEmail("user@example.com"), hashEmail("  User@Example.COM  "));
  });
});
