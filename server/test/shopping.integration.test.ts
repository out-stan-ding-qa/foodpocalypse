import "./env.js";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { resetDb } from "../src/db/index.js";
import { startTestServer } from "./http.js";

describe("shopping HTTP", () => {
  const app = createApp();
  let server: Awaited<ReturnType<typeof startTestServer>>;

  async function post(path: string, body: unknown) {
    return server.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function addItem(name: string) {
    const res = await post("/api/shopping/items", { name });
    assert.equal(res.status, 201);
    const { item } = (await res.json()) as { item: { id: string } };
    return item;
  }

  before(async () => {
    server = await startTestServer(app);
  });

  after(async () => {
    await server.close();
  });

  beforeEach(async () => {
    resetDb();
    server.jar.clear();
    await post("/api/auth/register", {
      email: "shopper@example.com",
      password: "correct-horse",
    });
  });

  it("starts with an empty current Shopping list", async () => {
    const res = await server.request("/api/shopping");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { list: { status: string }; items: unknown[] };
    assert.equal(body.list.status, "active");
    assert.deepEqual(body.items, []);
  });

  it("returns Shopping items oldest first and unchecked", async () => {
    await addItem("Bananas");
    await addItem("Oat milk");

    const res = await server.request("/api/shopping");
    const body = (await res.json()) as { items: { name: string; checked: boolean }[] };
    assert.deepEqual(
      body.items.map((item) => item.name),
      ["Bananas", "Oat milk"],
    );
    assert.deepEqual(
      body.items.map((item) => item.checked),
      [false, false],
    );
  });

  it("names a Shopping item after the Product it links to", async () => {
    const productRes = await post("/api/products", { name: "Oat milk" });
    const { product } = (await productRes.json()) as { product: { id: string } };

    const res = await post("/api/shopping/items", { name: "ignored", productId: product.id });
    assert.equal(res.status, 201);
    const { item } = (await res.json()) as { item: { name: string; productId: string } };
    assert.equal(item.name, "Oat milk");
    assert.equal(item.productId, product.id);
  });

  it("checks a Shopping item", async () => {
    const item = await addItem("Bananas");

    const res = await server.request(`/api/shopping/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: true }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { item: { checked: boolean } };
    assert.equal(body.item.checked, true);

    const reread = await server.request("/api/shopping");
    const current = (await reread.json()) as { items: { checked: boolean }[] };
    assert.equal(current.items[0]?.checked, true);
  });

  it("returns 404 when checking an item that is not on the current list", async () => {
    const res = await server.request("/api/shopping/items/no-such-item", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: true }),
    });
    assert.equal(res.status, 404);
  });

  it("refuses to archive an empty Shopping list", async () => {
    const res = await post("/api/shopping/archive", {});
    assert.equal(res.status, 400);
  });

  it("archives the current Shopping list and starts a fresh one", async () => {
    await addItem("Bananas");

    const archived = await post("/api/shopping/archive", {});
    assert.equal(archived.status, 200);
    const { list } = (await archived.json()) as { list: { status: string } };
    assert.equal(list.status, "active");

    const reread = await server.request("/api/shopping");
    const current = (await reread.json()) as { items: unknown[] };
    assert.deepEqual(current.items, []);

    const historyRes = await server.request("/api/shopping/history");
    const history = (await historyRes.json()) as { lists: { items: { name: string }[] }[] };
    assert.equal(history.lists.length, 1);
    assert.deepEqual(
      history.lists[0]?.items.map((item) => item.name),
      ["Bananas"],
    );
  });
});
