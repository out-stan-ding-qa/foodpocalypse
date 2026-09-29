import "./env.js";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeProductName } from "../src/domain/productName.js";

describe("normalizeProductName", () => {
  it("trims, collapses spaces, and lowercases", () => {
    assert.equal(normalizeProductName("  Oat   Milk "), "oat milk");
  });
});
