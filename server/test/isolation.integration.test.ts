import "./env.js";
import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { resetDb } from "../src/db/index.js";
import { registerUser, startTestServer } from "./http.js";

type Credentials = { email: string; password: string };
type Fixture = { store: { id: string }; product: { id: string }; dietProfile: { id: string } };

const ALICE: Credentials = { email: "alice@example.com", password: "correct-horse" };
const BOB: Credentials = { email: "bob@example.com", password: "battery-staple" };

describe("cross-User isolation", () => {
  const app = createApp();
  let server: Awaited<ReturnType<typeof startTestServer>>;
  let alice: Fixture;

  async function post(path: string, body: unknown) {
    return server.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function signInAs(who: Credentials) {
    server.jar.clear();
    const res = await post("/api/auth/login", who);
    assert.equal(res.status, 200);
  }

  // A User with one Store, one Product sold there, one Diet profile that Rates it,
  // and one archived Shopping list. Every table the read routes join through.
  async function seed(who: Credentials, tag: string, nutrient: string): Promise<Fixture> {
    server.jar.clear();
    assert.equal((await registerUser(server.request, who)).status, 201);

    const storeRes = await post("/api/stores", { name: `${tag} Market`, address: `1 ${tag} St` });
    assert.equal(storeRes.status, 201);
    const { store } = (await storeRes.json()) as Pick<Fixture, "store">;

    const productRes = await post("/api/products", { name: `${tag} Oat milk` });
    assert.equal(productRes.status, 201);
    const { product } = (await productRes.json()) as Pick<Fixture, "product">;

    const link = await post(`/api/products/${product.id}/stores`, { storeId: store.id });
    assert.equal(link.status, 204);

    const profileRes = await post("/api/diet-profiles", {
      name: `${tag} profile`,
      nutrients: [nutrient],
    });
    assert.equal(profileRes.status, 201);
    const { dietProfile } = (await profileRes.json()) as Pick<Fixture, "dietProfile">;

    const rating = await post(`/api/products/${product.id}/ratings`, {
      dietProfileId: dietProfile.id,
      rating: "green",
    });
    assert.equal(rating.status, 201);

    assert.equal((await post("/api/shopping/items", { name: `${tag} Bananas` })).status, 201);
    assert.equal((await post("/api/shopping/archive", {})).status, 200);

    return { store, product, dietProfile };
  }

  before(async () => {
    server = await startTestServer(app);
  });

  after(async () => {
    await server.close();
  });

  beforeEach(async () => {
    resetDb();
    alice = await seed(ALICE, "Alice", "fiber");
    await seed(BOB, "Bob", "calcium");
    await signInAs(ALICE);
  });

  it("lists only this User's Products, Store links, and Ratings", async () => {
    const res = await server.request("/api/products");
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      products: { id: string; storeIds: string[]; ratings: { dietProfileId: string }[] }[];
    };

    assert.deepEqual(
      body.products.map((product) => product.id),
      [alice.product.id],
    );
    assert.deepEqual(body.products[0]?.storeIds, [alice.store.id]);
    assert.deepEqual(
      body.products[0]?.ratings.map((rating) => rating.dietProfileId),
      [alice.dietProfile.id],
    );
  });

  it("shows only this User's Diet profiles and Tracked nutrients on a Product", async () => {
    const res = await server.request(`/api/products/${alice.product.id}`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      dietProfiles: { id: string; nutrients: string[] }[];
    };

    assert.deepEqual(
      body.dietProfiles.map((profile) => profile.id),
      [alice.dietProfile.id],
    );
    assert.deepEqual(body.dietProfiles[0]?.nutrients, ["fiber"]);
  });

  it("lists only this User's Diet profiles with their own Tracked nutrients", async () => {
    const res = await server.request("/api/diet-profiles");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { dietProfiles: { id: string; nutrients: string[] }[] };

    assert.deepEqual(
      body.dietProfiles.map((profile) => profile.id),
      [alice.dietProfile.id],
    );
    assert.deepEqual(body.dietProfiles[0]?.nutrients, ["fiber"]);
  });

  it("returns only this User's archived Shopping lists and their items", async () => {
    const res = await server.request("/api/shopping/history");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { lists: { items: { name: string }[] }[] };

    assert.equal(body.lists.length, 1);
    assert.deepEqual(
      body.lists[0]?.items.map((item) => item.name),
      ["Alice Bananas"],
    );
  });
});
