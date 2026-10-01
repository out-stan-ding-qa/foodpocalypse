import { nutritionFromOffNutriments } from "../domain/nutrients.js";
import { parseUpc } from "../domain/upc.js";

export type UpcLookupResult = {
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  nutrition: Record<string, number>;
};

export type UpcLookup =
  | { status: "found"; result: UpcLookupResult }
  | { status: "not_found" }
  | { status: "unavailable" };

export type NameLookupCandidate = UpcLookupResult & {
  upc: string | null;
};

export type NameLookup =
  | { status: "ok"; results: NameLookupCandidate[] }
  | { status: "unavailable" };

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  abbreviated_product_name?: string;
  generic_name?: string;
  brands?: string;
  image_url?: string;
  image_front_url?: string;
  ingredients_text?: string;
  nutriments?: Record<string, unknown>;
};

const OFF_HEADERS = {
  "User-Agent": "Foodpocalypse/0.1 (https://github.com/out-stan-ding-qa/foodpocalypse)",
  Accept: "application/json",
} as const;

const OFF_FETCH_TIMEOUT_MS = 8_000;

const OFF_PRODUCT_FIELDS = [
  "product_name",
  "product_name_en",
  "abbreviated_product_name",
  "generic_name",
  "brands",
  "image_url",
  "image_front_url",
  "ingredients_text",
  "nutriments",
] as const;

const OFF_FIELDS = ["status", ...OFF_PRODUCT_FIELDS].join(",");

/** Search-a-licious field projection for Capture name drafts (includes barcode). */
const NAME_SEARCH_FIELDS = ["code", ...OFF_PRODUCT_FIELDS].join(",");

const NAME_SEARCH_PAGE_SIZE = 10;

function pickName(product: OffProduct): string | null {
  const name = [
    product.product_name,
    product.product_name_en,
    product.abbreviated_product_name,
    product.generic_name,
  ]
    .map((value) => value?.trim())
    .find((value) => value);
  return name ?? null;
}

function mapOffProduct(product: OffProduct): UpcLookupResult | null {
  const name = pickName(product);
  if (!name) {
    return null;
  }
  return {
    name,
    brand: product.brands?.trim() ?? "",
    imageUrl: product.image_front_url || product.image_url || "",
    ingredients: product.ingredients_text?.trim() ?? "",
    nutrition: nutritionFromOffNutriments(product.nutriments),
  };
}

export async function lookupByUpc(upc: string): Promise<UpcLookup> {
  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json?fields=${OFF_FIELDS}`,
      { headers: OFF_HEADERS, signal: AbortSignal.timeout(OFF_FETCH_TIMEOUT_MS) },
    );
  } catch {
    return { status: "unavailable" };
  }
  if (response.status === 404) {
    return { status: "not_found" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  let data: {
    status?: number | string;
    product?: OffProduct;
  };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    return { status: "unavailable" };
  }
  const found = data.status === 1 || data.status === "1" || data.status === "success";
  if (!found || !data.product) {
    return { status: "not_found" };
  }
  const result = mapOffProduct(data.product);
  if (!result) {
    return { status: "not_found" };
  }
  return { status: "found", result };
}

function normalizeOffBrands(brands: unknown): string {
  if (Array.isArray(brands)) {
    return brands
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }
  return typeof brands === "string" ? brands.trim() : "";
}

export async function lookupByName(query: string): Promise<NameLookup> {
  // Full-text search via Search-a-licious. world.openfoodfacts.org/cgi/search.pl
  // (API v1 text search) is often unavailable; v2 /search is filter-only.
  const params = new URLSearchParams({
    q: query,
    page_size: String(NAME_SEARCH_PAGE_SIZE),
    fields: NAME_SEARCH_FIELDS,
  });
  let response: Response;
  try {
    response = await fetch(
      `https://search.openfoodfacts.org/search?${params.toString()}`,
      { headers: OFF_HEADERS, signal: AbortSignal.timeout(OFF_FETCH_TIMEOUT_MS) },
    );
  } catch {
    return { status: "unavailable" };
  }
  if (!response.ok) {
    return { status: "unavailable" };
  }
  let data: { hits?: OffProduct[]; products?: OffProduct[] };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    return { status: "unavailable" };
  }
  const products = Array.isArray(data.hits)
    ? data.hits
    : Array.isArray(data.products)
      ? data.products
      : [];
  const results: NameLookupCandidate[] = [];
  for (const product of products) {
    const mapped = mapOffProduct({
      ...product,
      brands: normalizeOffBrands(product.brands),
      ingredients_text: product.ingredients_text ?? "",
    });
    if (!mapped) {
      continue;
    }
    const upc = product.code ? parseUpc(String(product.code)) : null;
    results.push({ ...mapped, upc });
    if (results.length >= NAME_SEARCH_PAGE_SIZE) {
      break;
    }
  }
  return { status: "ok", results };
}
