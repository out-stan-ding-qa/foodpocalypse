import "./env.js";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { getDb, resetDb } from "../src/db/index.js";
import { productDietRatings } from "../src/db/schema.js";
import { startTestServer } from "./http.js";

async function register(request: Awaited<ReturnType<typeof startTestServer>>["request"]) {
  await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "shopper@example.com", password: "correct-horse" }),
  });
}

describe("diet HTTP", () => {
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

  it("stores a User Rating separately from Recommendation and shows the Rating", async () => {
    const productRes = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt" }),
    });
    const { product } = (await productRes.json()) as { product: { id: string } };
    const dietRes = await server.request("/api/diets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Low sodium", nutrients: ["Protein"] }),
    });
    const { diet } = (await dietRes.json()) as { diet: { id: string } };

    const rated = await server.request(`/api/products/${product.id}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietProfileId: diet.id, rating: "red" }),
    });
    assert.equal(rated.status, 201);
    const ratedBody = (await rated.json()) as {
      rating: string;
      recommendation: null;
      mark: string;
    };
    assert.equal(ratedBody.rating, "red");
    assert.equal(ratedBody.recommendation, null);
    assert.equal(ratedBody.mark, "red");

    const detail = await server.request(`/api/products/${product.id}`);
    const body = (await detail.json()) as {
      ratings: Array<{ rating: string; recommendation: null; mark: string }>;
    };
    assert.equal(body.ratings.length, 1);
    assert.equal(body.ratings[0]?.mark, "red");
  });

  it("shows a Recommendation when there is no Rating", async () => {
    const productRes = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt" }),
    });
    const { product } = (await productRes.json()) as { product: { id: string } };
    const dietRes = await server.request("/api/diets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "High protein", nutrients: ["Protein"] }),
    });
    const { diet } = (await dietRes.json()) as { diet: { id: string } };

    getDb()
      .insert(productDietRatings)
      .values({
        id: "rec-only",
        productId: product.id,
        dietProfileId: diet.id,
        rating: null,
        recommendation: "green",
        updatedAt: Date.now(),
      })
      .run();

    const detail = await server.request(`/api/products/${product.id}`);
    const body = (await detail.json()) as {
      ratings: Array<{ rating: null; recommendation: string; mark: string }>;
    };
    assert.equal(body.ratings[0]?.mark, "green");
    assert.equal(body.ratings[0]?.rating, null);
  });

  it("hides marks for an inactive Diet profile", async () => {
    const productRes = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt" }),
    });
    const { product } = (await productRes.json()) as { product: { id: string } };
    const dietRes = await server.request("/api/diets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Low sodium", nutrients: ["Protein"] }),
    });
    const { diet } = (await dietRes.json()) as { diet: { id: string } };
    await server.request(`/api/products/${product.id}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietProfileId: diet.id, rating: "red" }),
    });
    await server.request(`/api/diets/${diet.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });

    const detail = await server.request(`/api/products/${product.id}`);
    const body = (await detail.json()) as { ratings: unknown[] };
    assert.equal(body.ratings.length, 0);
  });
});
