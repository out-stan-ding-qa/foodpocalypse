import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  emailHash: text("email_hash").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const dietProfiles = sqliteTable("diet_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  active: integer("active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
});

export const dietProfileNutrients = sqliteTable("diet_profile_nutrients", {
  id: text("id").primaryKey(),
  dietProfileId: text("diet_profile_id")
    .notNull()
    .references(() => dietProfiles.id, { onDelete: "cascade" }),
  nutrient: text("nutrient").notNull(),
});

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    upc: text("upc"),
    brand: text("brand"),
    ingredients: text("ingredients").notNull().default(""),
    nutritionJson: text("nutrition_json").notNull().default("{}"),
    sourceType: text("source_type").notNull().default("manual"),
    imageUrl: text("image_url"),
    notes: text("notes").notNull().default(""),
    listingUrl: text("listing_url"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    userUpc: uniqueIndex("products_user_upc").on(table.userId, table.upc),
  }),
);

export const stores = sqliteTable("stores", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const productStores = sqliteTable(
  "product_stores",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storeId: text("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: uniqueIndex("product_stores_pk").on(table.productId, table.storeId),
  }),
);

export const productDietRatings = sqliteTable(
  "product_diet_ratings",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    dietProfileId: text("diet_profile_id")
      .notNull()
      .references(() => dietProfiles.id, { onDelete: "cascade" }),
    rating: text("rating"),
    recommendation: text("recommendation"),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => ({
    uniquePair: uniqueIndex("product_diet_ratings_unique").on(
      table.productId,
      table.dietProfileId,
    ),
  }),
);

export const shoppingLists = sqliteTable("shopping_lists", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const shoppingListItems = sqliteTable("shopping_list_items", {
  id: text("id").primaryKey(),
  listId: text("list_id")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  checked: integer("checked").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});
