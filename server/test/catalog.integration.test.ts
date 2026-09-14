import "./env.js";
import { after, afterEach, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { resetDb } from "../src/db/index.js";
import { registerUser, startTestServer } from "./http.js";

const realFetch = globalThis.fetch;

function stubOpenFoodFacts(handler: typeof fetch) {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("openfoodfacts.org")) {
      return handler(input, init);
    }
    return realFetch(input, init);
  };
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
    await registerUser(server.request);
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
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

  it("rejects a Product whose UPC is not a valid GS1 code", async () => {
    const res = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Mystery can", upc: "012345678901" }),
    });
    assert.equal(res.status, 400);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "Enter a valid UPC");
  });

  it("normalizes a scanned UPC before storing it", async () => {
    const res = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Oat milk", upc: "0 12345 67890 5" }),
    });
    assert.equal(res.status, 201);
    const body = (await res.json()) as { product: { upc: string } };
    assert.equal(body.product.upc, "012345678905");
  });

  it("rejects a duplicate UPC written in a different format", async () => {
    const first = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt A", upc: "012345678905" }),
    });
    assert.equal(first.status, 201);

    const second = await server.request("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Yogurt B", upc: "0-12345-67890-5" }),
    });
    assert.equal(second.status, 400);
    const body = (await second.json()) as { error: string };
    assert.equal(body.error, "A product with this UPC already exists");
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

  it("updates a Store name and location for this User", async () => {
    const created = await server.request("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kroger", address: "123 Main St" }),
    });
    const { store } = (await created.json()) as { store: { id: string } };
    const patched = await server.request(`/api/stores/${store.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Costco", address: "https://costco.com" }),
    });
    assert.equal(patched.status, 200);
    const listed = await server.request("/api/stores");
    const body = (await listed.json()) as { stores: Array<{ name: string; address: string }> };
    assert.equal(body.stores.length, 1);
    assert.equal(body.stores[0].name, "Costco");
    assert.equal(body.stores[0].address, "https://costco.com");
  });

  it("removes a Store for this User", async () => {
    const created = await server.request("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kroger", address: "123 Main St" }),
    });
    const { store } = (await created.json()) as { store: { id: string } };
    const deleted = await server.request(`/api/stores/${store.id}`, { method: "DELETE" });
    assert.equal(deleted.status, 204);
    const listed = await server.request("/api/stores");
    const body = (await listed.json()) as { stores: Array<{ id: string }> };
    assert.equal(body.stores.length, 0);
  });

  it("rejects updating a Store to a non-http URL location", async () => {
    const created = await server.request("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kroger", address: "123 Main St" }),
    });
    const { store } = (await created.json()) as { store: { id: string } };
    const patched = await server.request(`/api/stores/${store.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Kroger", address: "javascript:alert(1)" }),
    });
    assert.equal(patched.status, 400);
  });

  it("lists this User's Stores by name", async () => {
    for (const name of ["Zero Waste", "Aldi", "Market Basket"]) {
      const created = await server.request("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address: "1 Main St" }),
      });
      assert.equal(created.status, 201);
    }

    const res = await server.request("/api/stores");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { stores: Array<{ name: string }> };
    assert.deepEqual(
      body.stores.map((store) => store.name),
      ["Aldi", "Market Basket", "Zero Waste"],
    );
  });

  it("looks up a Product by UPC for a signed-in User", async () => {
    stubOpenFoodFacts(async () =>
      new Response(
        JSON.stringify({
          status: 1,
          product: {
            product_name: "Test Fixture Oat Milk",
            brands: "Oaty",
            image_front_url: "https://images.example.com/oat.jpg",
            ingredients_text: "Oat base, rapeseed oil",
            nutriments: {
              "energy-kcal_100g": 48,
              proteins_100g: 1.1,
              potassium_100g: 0.15,
              salt_100g: 0.2,
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    const res = await server.request("/api/products/upc-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upc: "012345678905" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      result: {
        name: string;
        brand: string;
        upc: string;
        listingUrl: string | null;
        nutrition: Record<string, number>;
      };
    };
    assert.equal(body.result.name, "Test Fixture Oat Milk");
    assert.equal(body.result.brand, "Oaty");
    assert.equal(body.result.upc, "012345678905");
    assert.equal(body.result.listingUrl, null);
    assert.equal(body.result.nutrition["energy-kcal"], 48);
    assert.equal(body.result.nutrition.proteins, 1.1);
    assert.equal(body.result.nutrition.potassium, 0.15);
    assert.equal(body.result.nutrition.salt, undefined);
    assert.equal(body.result.nutrition.calories, undefined);
    assert.equal(body.result.nutrition.protein, undefined);
  });

  it("does not treat an Open Food Facts outage as a missing Product", async () => {
    stubOpenFoodFacts(
      async () =>
        new Response("<html>service unavailable</html>", {
          status: 503,
          headers: { "content-type": "text/html" },
        }),
    );

    const res = await server.request("/api/products/upc-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upc: "3017620422003" }),
    });
    const body = (await res.json()) as { error?: string };
    assert.equal(res.status, 502);
    assert.equal(body.error, "UPC lookup is unavailable");
  });

  it("returns 404 when Open Food Facts has no Product for the UPC", async () => {
    stubOpenFoodFacts(
      async () =>
        new Response(JSON.stringify({ status: 0, status_verbose: "product not found" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
    );

    const res = await server.request("/api/products/upc-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upc: "6291041500213" }),
    });
    const body = (await res.json()) as { error?: string };
    assert.equal(res.status, 404);
    assert.equal(body.error, "Product not found");
  });

  it("does not call Open Food Facts when the UPC is not valid", async () => {
    let called = false;
    stubOpenFoodFacts(async () => {
      called = true;
      return new Response("should not run", { status: 500 });
    });

    const res = await server.request("/api/products/upc-lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upc: "012345678901" }),
    });
    const body = (await res.json()) as { error?: string };
    assert.equal(res.status, 400);
    assert.equal(body.error, "Enter a valid UPC");
    assert.equal(called, false);
  });

});
