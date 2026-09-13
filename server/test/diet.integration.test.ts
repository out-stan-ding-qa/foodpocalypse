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
    const profileRes = await server.request("/api/diet-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Low sodium", nutrients: ["Protein"] }),
    });
    const { dietProfile } = (await profileRes.json()) as { dietProfile: { id: string } };

    const rated = await server.request(`/api/products/${product.id}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietProfileId: dietProfile.id, rating: "red" }),
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
    const profileRes = await server.request("/api/diet-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "High protein", nutrients: ["Protein"] }),
    });
    const { dietProfile } = (await profileRes.json()) as { dietProfile: { id: string } };

    getDb()
      .insert(productDietRatings)
      .values({
        id: "rec-only",
        productId: product.id,
        dietProfileId: dietProfile.id,
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

  it("adds a Tracked nutrient to a Diet profile once", async () => {
    const profileRes = await server.request("/api/diet-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Low sodium", nutrients: [] }),
    });
    const { dietProfile } = (await profileRes.json()) as { dietProfile: { id: string } };

    const first = await server.request(`/api/diet-profiles/${dietProfile.id}/nutrients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nutrient: "Iron" }),
    });
    const again = await server.request(`/api/diet-profiles/${dietProfile.id}/nutrients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nutrient: "Iron" }),
    });
    assert.equal(first.status, 204);
    assert.equal(again.status, 204);

    const list = await server.request("/api/diet-profiles");
    const body = (await list.json()) as { dietProfiles: Array<{ nutrients: string[] }> };
    assert.deepEqual(body.dietProfiles[0]?.nutrients, ["Iron"]);
  });

  it("rejects a nutrient that is not on the tracked list", async () => {
    const profileRes = await server.request("/api/diet-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Low sodium", nutrients: [] }),
    });
    const { dietProfile } = (await profileRes.json()) as { dietProfile: { id: string } };

    const res = await server.request(`/api/diet-profiles/${dietProfile.id}/nutrients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nutrient: "Sodium" }),
    });
    assert.equal(res.status, 400);
  });

  it("returns 404 when adding a Tracked nutrient to an unknown Diet profile", async () => {
    const res = await server.request("/api/diet-profiles/no-such-profile/nutrients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nutrient: "Iron" }),
    });
    assert.equal(res.status, 404);
  });

  it("removes a Tracked nutrient from a Diet profile", async () => {
    const profileRes = await server.request("/api/diet-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Low sodium", nutrients: ["Fiber", "Vitamin B-12"] }),
    });
    const { dietProfile } = (await profileRes.json()) as { dietProfile: { id: string } };

    const res = await server.request(
      `/api/diet-profiles/${dietProfile.id}/nutrients/${encodeURIComponent("Vitamin B-12")}`,
      { method: "DELETE" },
    );
    assert.equal(res.status, 204);

    const list = await server.request("/api/diet-profiles");
    const body = (await list.json()) as { dietProfiles: Array<{ nutrients: string[] }> };
    assert.deepEqual(body.dietProfiles[0]?.nutrients, ["Fiber"]);
  });

  it("hides marks for an inactive Diet profile", async () => {
    const productRes = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt" }),
    });
    const { product } = (await productRes.json()) as { product: { id: string } };
    const profileRes = await server.request("/api/diet-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Low sodium", nutrients: ["Protein"] }),
    });
    const { dietProfile } = (await profileRes.json()) as { dietProfile: { id: string } };
    await server.request(`/api/products/${product.id}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dietProfileId: dietProfile.id, rating: "red" }),
    });
    await server.request(`/api/diet-profiles/${dietProfile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });

    const detail = await server.request(`/api/products/${product.id}`);
    const body = (await detail.json()) as { ratings: unknown[] };
    assert.equal(body.ratings.length, 0);
  });
});
