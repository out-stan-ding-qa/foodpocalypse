import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseUpc } from "../src/domain/upc.js";

describe("parseUpc", () => {
  it("accepts a GTIN-13 with a valid GS1 check digit", () => {
    assert.equal(parseUpc("6291041500213"), "6291041500213");
  });

  it("accepts a UPC-A with a valid check digit", () => {
    assert.equal(parseUpc("012345678905"), "012345678905");
  });

  it("strips spaces and dashes before validating", () => {
    assert.equal(parseUpc("3017 6204 2200 3"), "3017620422003");
  });

  it("pads an 11-digit scan that is a UPC-A missing the leading zero", () => {
    assert.equal(parseUpc("12345678905"), "012345678905");
  });

  it("rejects a code whose check digit does not match", () => {
    assert.equal(parseUpc("012345678901"), null);
  });

  it("rejects a digit run that is not a GTIN length", () => {
    assert.equal(parseUpc("123456789"), null);
  });

  it("rejects an all-zero code even though the check digit is 0", () => {
    assert.equal(parseUpc("000000000000"), null);
  });

  it("rejects a store-internal or coupon UPC that cannot be looked up globally", () => {
    assert.equal(parseUpc("200000000004"), null);
    assert.equal(parseUpc("400000000008"), null);
    assert.equal(parseUpc("500000000005"), null);
    assert.equal(parseUpc("2000000000008"), null);
  });
});
