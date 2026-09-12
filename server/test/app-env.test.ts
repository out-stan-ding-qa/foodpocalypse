import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadDotenvFile, resolveAppEnv } from "../src/appEnv.js";

describe("resolveAppEnv", () => {
  it("uses APP_ENV when it is local, production, or test", () => {
    assert.equal(resolveAppEnv({ APP_ENV: "local" }), "local");
    assert.equal(resolveAppEnv({ APP_ENV: "production", NODE_ENV: "test" }), "production");
    assert.equal(resolveAppEnv({ APP_ENV: "test" }), "test");
  });

  it("infers from NODE_ENV when APP_ENV is unset", () => {
    assert.equal(resolveAppEnv({ NODE_ENV: "test" }), "test");
    assert.equal(resolveAppEnv({ NODE_ENV: "production" }), "production");
    assert.equal(resolveAppEnv({ NODE_ENV: "development" }), "local");
    assert.equal(resolveAppEnv({}), "local");
  });
});

describe("loadDotenvFile", () => {
  it("loads a dotenv file only for local", () => {
    assert.equal(loadDotenvFile("local"), true);
    assert.equal(loadDotenvFile("production"), false);
    assert.equal(loadDotenvFile("test"), false);
  });
});
