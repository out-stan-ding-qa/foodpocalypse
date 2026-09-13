import { randomUUID } from "node:crypto";
import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { requireUser } from "../auth/request.js";
import { getDb } from "../db/index.js";
import {
  dietProfileNutrients,
  dietProfiles,
  productDietRatings,
  products,
  productStores,
  shoppingListItems,
  shoppingLists,
  stores,
} from "../db/schema.js";
import { isTrafficLight, visibleMark } from "../domain/mark.js";
import { isTrackedNutrient } from "../domain/nutrients.js";
import { isValidStoreLocation } from "../domain/storeLocation.js";
import { parseUpc } from "../domain/upc.js";
import { lookupByUpc } from "../ingestion/openFoodFacts.js";

export const appRouter = Router();

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseNutrition(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function serializeProduct(row: typeof products.$inferSelect) {
  return {
    ...row,
    nutrition: parseNutrition(row.nutritionJson),
  };
}

async function ownedProduct(userId: string, productId: string) {
  return getDb()
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .get();
}

function trackedNutrientsFor(userId: string) {
  return getDb()
    .select({
      dietProfileId: dietProfileNutrients.dietProfileId,
      nutrient: dietProfileNutrients.nutrient,
    })
    .from(dietProfileNutrients)
    .innerJoin(dietProfiles, eq(dietProfiles.id, dietProfileNutrients.dietProfileId))
    .where(eq(dietProfiles.userId, userId))
    .all();
}

function activeListFor(userId: string) {
  const db = getDb();
  const existing = db
    .select()
    .from(shoppingLists)
    .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.status, "active")))
    .get();
  if (existing) {
    return existing;
  }
  const created = {
    id: randomUUID(),
    userId,
    status: "active",
    createdAt: Date.now(),
    archivedAt: null as number | null,
  };
  db.insert(shoppingLists).values(created).run();
  return created;
}

appRouter.post("/products/upc-lookup", async (req, res) => {
  if (!(await requireUser(req, res))) {
    return;
  }
  const upc = parseUpc(asString(req.body?.upc));
  if (!upc) {
    res.status(400).json({ error: "Enter a valid UPC" });
    return;
  }
  const lookup = await lookupByUpc(upc);
  if (lookup.status === "unavailable") {
    res.status(502).json({ error: "UPC lookup is unavailable" });
    return;
  }
  if (lookup.status === "not_found") {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ result: { ...lookup.result, upc, listingUrl: null } });
});

appRouter.get("/products", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const db = getDb();
  const rows = db
    .select()
    .from(products)
    .where(eq(products.userId, user.sub))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));

  const storeLinks = db
    .select({ productId: productStores.productId, storeId: productStores.storeId })
    .from(productStores)
    .innerJoin(products, eq(products.id, productStores.productId))
    .where(eq(products.userId, user.sub))
    .all();
  const ratings = db
    .select({
      id: productDietRatings.id,
      productId: productDietRatings.productId,
      dietProfileId: productDietRatings.dietProfileId,
      rating: productDietRatings.rating,
      recommendation: productDietRatings.recommendation,
      updatedAt: productDietRatings.updatedAt,
    })
    .from(productDietRatings)
    .innerJoin(products, eq(products.id, productDietRatings.productId))
    .where(eq(products.userId, user.sub))
    .all();

  res.json({
    products: rows.map((row) => ({
      ...serializeProduct(row),
      storeIds: storeLinks.filter((link) => link.productId === row.id).map((link) => link.storeId),
      ratings: ratings.filter((rating) => rating.productId === row.id),
    })),
  });
});

appRouter.post("/products", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const name = asString(req.body?.name);
  if (!name) {
    res.status(400).json({ error: "Product name is required" });
    return;
  }
  const now = Date.now();
  const nutrition =
    req.body?.nutrition && typeof req.body.nutrition === "object"
      ? req.body.nutrition
      : {};
  const listingUrl = asString(req.body?.listingUrl) || null;
  const scanned = asString(req.body?.upc);
  // A UPC is optional, but a supplied one is stored parsed so the
  // (user_id, upc) index sees one spelling of each code.
  const upc = scanned ? parseUpc(scanned) : null;
  if (scanned && !upc) {
    res.status(400).json({ error: "Enter a valid UPC" });
    return;
  }
  const id = randomUUID();
  try {
    getDb()
      .insert(products)
      .values({
        id,
        userId: user.sub,
        name,
        upc,
        brand: asString(req.body?.brand) || null,
        ingredients: asString(req.body?.ingredients),
        nutritionJson: JSON.stringify(nutrition),
        sourceType: asString(req.body?.sourceType) || "manual",
        imageUrl: asString(req.body?.imageUrl) || null,
        notes: asString(req.body?.notes),
        listingUrl,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      res.status(400).json({ error: "A product with this UPC already exists" });
      return;
    }
    throw err;
  }
  const created = getDb().select().from(products).where(eq(products.id, id)).get();
  res.status(201).json({ product: created ? serializeProduct(created) : null });
});

appRouter.get("/products/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const product = await ownedProduct(user.sub, String(req.params.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const db = getDb();
  const linkedStoreIds = db
    .select()
    .from(productStores)
    .where(eq(productStores.productId, product.id))
    .all()
    .map((row) => row.storeId);
  const userStores = db.select().from(stores).where(eq(stores.userId, user.sub)).all();
  const ratings = db
    .select()
    .from(productDietRatings)
    .where(eq(productDietRatings.productId, product.id))
    .all();
  const profiles = db
    .select()
    .from(dietProfiles)
    .where(eq(dietProfiles.userId, user.sub))
    .all();
  const nutrients = trackedNutrientsFor(user.sub);

  res.json({
    product: serializeProduct(product),
    stores: userStores.filter((store) => linkedStoreIds.includes(store.id)),
    unlinkedStores: userStores.filter((store) => !linkedStoreIds.includes(store.id)),
    ratings: ratings
      .map((row) => {
        const dietProfile = profiles.find((profile) => profile.id === row.dietProfileId) ?? null;
        const rating = row.rating && isTrafficLight(row.rating) ? row.rating : null;
        const recommendation =
          row.recommendation && isTrafficLight(row.recommendation)
            ? row.recommendation
            : null;
        return {
          dietProfileId: row.dietProfileId,
          rating,
          recommendation,
          mark: visibleMark(rating, recommendation),
          dietProfile,
        };
      })
      .filter((row) => row.dietProfile?.active && row.mark),
    dietProfiles: profiles.map((profile) => ({
      ...profile,
      active: Boolean(profile.active),
      nutrients: nutrients
        .filter((row) => row.dietProfileId === profile.id)
        .map((row) => row.nutrient),
    })),
  });
});

appRouter.patch("/products/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const product = await ownedProduct(user.sub, String(req.params.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const listingUrl =
    req.body?.listingUrl === null ? null : asString(req.body?.listingUrl) || product.listingUrl;
  getDb()
    .update(products)
    .set({
      listingUrl,
      updatedAt: Date.now(),
    })
    .where(eq(products.id, product.id))
    .run();
  const updated = getDb().select().from(products).where(eq(products.id, product.id)).get();
  res.json({ product: updated ? serializeProduct(updated) : null });
});

appRouter.post("/products/:id/stores", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const product = await ownedProduct(user.sub, String(req.params.id));
  const storeId = asString(req.body?.storeId);
  const store = getDb()
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.userId, user.sub)))
    .get();
  if (!product || !store) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  getDb()
    .insert(productStores)
    .values({ productId: product.id, storeId: store.id })
    .onConflictDoNothing()
    .run();
  res.status(204).end();
});

appRouter.post("/products/:id/ratings", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const product = await ownedProduct(user.sub, String(req.params.id));
  const dietProfileId = asString(req.body?.dietProfileId);
  const ratingValue = asString(req.body?.rating) || "yellow";
  const profile = getDb()
    .select()
    .from(dietProfiles)
    .where(and(eq(dietProfiles.id, dietProfileId), eq(dietProfiles.userId, user.sub)))
    .get();
  if (!product || !profile) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (!isTrafficLight(ratingValue)) {
    res.status(400).json({ error: "Invalid rating" });
    return;
  }
  const existing = getDb()
    .select()
    .from(productDietRatings)
    .where(
      and(
        eq(productDietRatings.productId, product.id),
        eq(productDietRatings.dietProfileId, profile.id),
      ),
    )
    .get();
  if (existing) {
    getDb()
      .update(productDietRatings)
      .set({ rating: ratingValue, updatedAt: Date.now() })
      .where(eq(productDietRatings.id, existing.id))
      .run();
    const recommendation =
      existing.recommendation && isTrafficLight(existing.recommendation)
        ? existing.recommendation
        : null;
    res.json({
      rating: ratingValue,
      recommendation,
      mark: visibleMark(ratingValue, recommendation),
    });
    return;
  }
  getDb()
    .insert(productDietRatings)
    .values({
      id: randomUUID(),
      productId: product.id,
      dietProfileId: profile.id,
      rating: ratingValue,
      recommendation: null,
      updatedAt: Date.now(),
    })
    .run();
  res.status(201).json({
    rating: ratingValue,
    recommendation: null,
    mark: visibleMark(ratingValue, null),
  });
});

appRouter.get("/stores", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const rows = getDb()
    .select()
    .from(stores)
    .where(eq(stores.userId, user.sub))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json({ stores: rows });
});

appRouter.post("/stores", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const name = asString(req.body?.name);
  const address = asString(req.body?.address);
  if (!name || !isValidStoreLocation(address)) {
    res.status(400).json({ error: "Store name and location are required" });
    return;
  }
  const store = {
    id: randomUUID(),
    userId: user.sub,
    name,
    address,
    createdAt: Date.now(),
  };
  getDb().insert(stores).values(store).run();
  res.status(201).json({ store });
});

appRouter.get("/diets", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const db = getDb();
  const profiles = db
    .select()
    .from(dietProfiles)
    .where(eq(dietProfiles.userId, user.sub))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));
  const nutrients = trackedNutrientsFor(user.sub);
  res.json({
    diets: profiles.map((profile) => ({
      ...profile,
      active: Boolean(profile.active),
      nutrients: nutrients
        .filter((row) => row.dietProfileId === profile.id)
        .map((row) => row.nutrient),
    })),
  });
});

appRouter.post("/diets", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const name = asString(req.body?.name);
  if (!name) {
    res.status(400).json({ error: "Diet profile name is required" });
    return;
  }
  const selected = Array.isArray(req.body?.nutrients)
    ? (req.body.nutrients as unknown[]).filter(
        (item): item is string => typeof item === "string" && isTrackedNutrient(item),
      )
    : [];
  const profile = {
    id: randomUUID(),
    userId: user.sub,
    name,
    active: 1,
    createdAt: Date.now(),
  };
  const db = getDb();
  db.insert(dietProfiles).values(profile).run();
  for (const nutrient of selected) {
    db.insert(dietProfileNutrients)
      .values({ id: randomUUID(), dietProfileId: profile.id, nutrient })
      .run();
  }
  res.status(201).json({
    diet: { ...profile, active: true, nutrients: selected },
  });
});

appRouter.patch("/diets/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const db = getDb();
  const profile = db
    .select()
    .from(dietProfiles)
    .where(and(eq(dietProfiles.id, String(req.params.id)), eq(dietProfiles.userId, user.sub)))
    .get();
  if (!profile) {
    res.status(404).json({ error: "Diet profile not found" });
    return;
  }
  const name = asString(req.body?.name) || profile.name;
  const active =
    typeof req.body?.active === "boolean" ? (req.body.active ? 1 : 0) : profile.active;
  db.update(dietProfiles)
    .set({ name, active })
    .where(eq(dietProfiles.id, profile.id))
    .run();
  res.json({ diet: { ...profile, name, active: Boolean(active) } });
});

appRouter.post("/diets/:id/nutrients", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const nutrient = asString(req.body?.nutrient);
  if (!isTrackedNutrient(nutrient)) {
    res.status(400).json({ error: "Choose a tracked nutrient from the list" });
    return;
  }
  const db = getDb();
  const profile = db
    .select()
    .from(dietProfiles)
    .where(and(eq(dietProfiles.id, String(req.params.id)), eq(dietProfiles.userId, user.sub)))
    .get();
  if (!profile) {
    res.status(404).json({ error: "Diet profile not found" });
    return;
  }
  const existing = db
    .select()
    .from(dietProfileNutrients)
    .where(
      and(
        eq(dietProfileNutrients.dietProfileId, profile.id),
        eq(dietProfileNutrients.nutrient, nutrient),
      ),
    )
    .get();
  if (!existing) {
    db.insert(dietProfileNutrients)
      .values({ id: randomUUID(), dietProfileId: profile.id, nutrient })
      .run();
  }
  res.status(204).end();
});

appRouter.delete("/diets/:id/nutrients/:nutrient", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const nutrient = decodeURIComponent(String(req.params.nutrient));
  const db = getDb();
  const profile = db
    .select()
    .from(dietProfiles)
    .where(and(eq(dietProfiles.id, String(req.params.id)), eq(dietProfiles.userId, user.sub)))
    .get();
  if (!profile) {
    res.status(404).json({ error: "Diet profile not found" });
    return;
  }
  db.delete(dietProfileNutrients)
    .where(
      and(
        eq(dietProfileNutrients.dietProfileId, profile.id),
        eq(dietProfileNutrients.nutrient, nutrient),
      ),
    )
    .run();
  res.status(204).end();
});

appRouter.get("/shopping", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const list = activeListFor(user.sub);
  const items = getDb()
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, list.id))
    .all()
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json({
    list,
    items: items.map((item) => ({ ...item, checked: Boolean(item.checked) })),
  });
});

appRouter.post("/shopping/items", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const name = asString(req.body?.name);
  if (!name) {
    res.status(400).json({ error: "Item name is required" });
    return;
  }
  const list = activeListFor(user.sub);
  const productId = asString(req.body?.productId) || null;
  const product = productId ? await ownedProduct(user.sub, productId) : null;
  const item = {
    id: randomUUID(),
    listId: list.id,
    name: product?.name ?? name,
    productId: product?.id ?? null,
    checked: 0,
    createdAt: Date.now(),
  };
  getDb().insert(shoppingListItems).values(item).run();
  res.status(201).json({ item: { ...item, checked: false } });
});

appRouter.patch("/shopping/items/:id", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const list = activeListFor(user.sub);
  const item = getDb()
    .select()
    .from(shoppingListItems)
    .where(
      and(eq(shoppingListItems.id, String(req.params.id)), eq(shoppingListItems.listId, list.id)),
    )
    .get();
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const checked = typeof req.body?.checked === "boolean" ? (req.body.checked ? 1 : 0) : item.checked;
  getDb()
    .update(shoppingListItems)
    .set({ checked })
    .where(eq(shoppingListItems.id, item.id))
    .run();
  res.json({ item: { ...item, checked: Boolean(checked) } });
});

appRouter.post("/shopping/archive", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const list = activeListFor(user.sub);
  const items = getDb()
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, list.id))
    .all();
  if (items.length === 0) {
    res.status(400).json({ error: "Current list is empty" });
    return;
  }
  getDb()
    .update(shoppingLists)
    .set({ status: "archived", archivedAt: Date.now() })
    .where(eq(shoppingLists.id, list.id))
    .run();
  const next = activeListFor(user.sub);
  res.json({ list: next });
});

appRouter.get("/shopping/history", async (req, res) => {
  const user = await requireUser(req, res);
  if (!user) {
    return;
  }
  const lists = getDb()
    .select()
    .from(shoppingLists)
    .where(and(eq(shoppingLists.userId, user.sub), eq(shoppingLists.status, "archived")))
    .orderBy(desc(shoppingLists.archivedAt))
    .all();
  const items = getDb()
    .select({
      id: shoppingListItems.id,
      listId: shoppingListItems.listId,
      name: shoppingListItems.name,
      productId: shoppingListItems.productId,
      checked: shoppingListItems.checked,
      createdAt: shoppingListItems.createdAt,
    })
    .from(shoppingListItems)
    .innerJoin(shoppingLists, eq(shoppingLists.id, shoppingListItems.listId))
    .where(eq(shoppingLists.userId, user.sub))
    .all();
  res.json({
    lists: lists.map((list) => ({
      ...list,
      items: items
        .filter((item) => item.listId === list.id)
        .map((item) => ({ ...item, checked: Boolean(item.checked) })),
    })),
  });
});
