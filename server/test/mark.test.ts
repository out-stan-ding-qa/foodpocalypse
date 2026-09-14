import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { markAnnouncement, markKind, nextRating, resetActionName, visibleMark } from "../src/domain/mark.js";

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

describe("markKind", () => {
  it("is rating when a Rating is present", () => {
    assert.equal(markKind("red", "green"), "rating");
  });

  it("is recommendation when only a Recommendation is present", () => {
    assert.equal(markKind(null, "yellow"), "recommendation");
  });

  it("is empty when neither mark exists", () => {
    assert.equal(markKind(null, null), "empty");
  });
});

describe("nextRating", () => {
  it("cycles green to yellow to red to green", () => {
    assert.equal(nextRating("green"), "yellow");
    assert.equal(nextRating("yellow"), "red");
    assert.equal(nextRating("red"), "green");
  });
});

describe("markAnnouncement", () => {
  it("names a Rating as the User's mark", () => {
    assert.equal(markAnnouncement("CKD Stage 4", "red", "green"), "CKD Stage 4, your Rating, avoid");
  });

  it("names a Recommendation as the system's mark", () => {
    assert.equal(
      markAnnouncement("CKD Stage 4", null, "yellow"),
      "CKD Stage 4, Recommendation, caution",
    );
  });

  it("names the empty mark", () => {
    assert.equal(markAnnouncement("CKD Stage 4", null, null), "CKD Stage 4, no mark");
  });
});

describe("resetActionName", () => {
  it("uses Recommendation when one exists", () => {
    assert.equal(resetActionName("green"), "Use Recommendation");
  });

  it("clears the Rating when there is no Recommendation", () => {
    assert.equal(resetActionName(null), "Clear Rating");
  });
});
