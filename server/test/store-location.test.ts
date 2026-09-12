import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidStoreLocation } from "../src/domain/storeLocation.js";

describe("isValidStoreLocation", () => {
  it("accepts a street address", () => {
    assert.equal(isValidStoreLocation("123 Main St, Springfield"), true);
  });

  it("accepts an https retailer URL", () => {
    assert.equal(isValidStoreLocation("https://shop.example.com"), true);
  });

  it("rejects an empty location", () => {
    assert.equal(isValidStoreLocation("   "), false);
  });

  it("rejects a non-http URL scheme", () => {
    assert.equal(isValidStoreLocation("javascript:alert(1)"), false);
  });
});
