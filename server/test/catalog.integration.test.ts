import "./env.js";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { resetDb } from "../src/db/index.js";
import { startTestServer } from "./http.js";

async function register(request: Awaited<ReturnType<typeof startTestServer>>["request"]) {
  await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "shopper@example.com", password: "correct-horse" }),
  });
}

describe("catalog HTTP", () => {
  const app = createApp();
  let server: Awaited<ReturnType<typeof startTestServer>>;

  before(async () => {
    server = await startTestServer(app);
  });

  after(async () => {
    await server.close();
  });

  beforeEach(async () => {
    resetDb();
    server.jar.clear();
    await register(server.request);
  });

  it("creates a Product without a Listing", async () => {
    const res = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Plain yogurt" }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as { product: { listingUrl: string | null } };
    assert.equal(body.product.listingUrl, null);
  });

  it("saves a Listing URL on a Product", async () => {
    const created = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt" }),
    });
    const { product } = (await created.json()) as { product: { id: string } };
    const patched = await server.request(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingUrl: "https://shop.example.com/yogurt" }),
    });
    assert.equal(patched.status, 200);
    const body = (await patched.json()) as { product: { listingUrl: string } };
    assert.equal(body.product.listingUrl, "https://shop.example.com/yogurt");
  });

  it("rejects a second Product with the same UPC for this User", async () => {
    const first = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt A", upc: "012345678905" }),
    });
    assert.equal(first.status, 201);
    const second = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt B", upc: "012345678905" }),
    });
    assert.equal(second.status, 400);
  });

  it("allows two Products without a UPC", async () => {
    const first = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Paper towels" }),
    });
    const second = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Oat milk" }),
    });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
  });

  it("creates a Store with a street address or a retailer URL", async () => {
    const street = await server.request("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kroger", address: "123 Main St" }),
    });
    const online = await server.request("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bulk Shop", address: "https://bulk.example.com" }),
    });
    assert.equal(street.status, 201);
    assert.equal(online.status, 201);
  });

  it("rejects a Store with a non-http URL location", async () => {
    const res = await server.request("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bad", address: "javascript:alert(1)" }),
    });
    assert.equal(res.status, 400);
  });
});
