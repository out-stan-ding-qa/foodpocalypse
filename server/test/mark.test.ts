import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { visibleMark } from "../src/domain/mark.js";

describe("visibleMark", () => {
  it("uses the Rating when both marks exist", () => {
    assert.equal(visibleMark("red", "green"), "red");
  });

  it("uses the Recommendation when there is no Rating", () => {
    assert.equal(visibleMark(null, "yellow"), "yellow");
  });

  it("is blank when neither mark exists", () => {
    assert.equal(visibleMark(null, null), null);
  });
});
