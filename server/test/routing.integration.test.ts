import "./env.js";
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { startTestServer } from "./http.js";

describe("API routing", () => {
  const app = createApp();
  let server: Awaited<ReturnType<typeof startTestServer>>;

  before(async () => {
    server = await startTestServer(app);
  });

  after(async () => {
    await server.close();
  });

  it("answers an unknown API route with a JSON 404", async () => {
    const res = await server.request("/api/no-such-route");
    assert.equal(res.status, 404);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await res.json(), { error: "Not found" });
  });

  it("answers an unknown API route with a JSON 404 for any method", async () => {
    const res = await server.request("/api/no-such-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 404);
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await res.json(), { error: "Not found" });
  });

  it("still reports a malformed JSON body as a bad request", async () => {
    const res = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: "Bad request" });
  });
});
