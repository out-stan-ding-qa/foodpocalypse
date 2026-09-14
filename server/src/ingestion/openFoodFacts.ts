import { nutritionFromOffNutriments } from "../domain/nutrients.js";

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

const OFF_FIELDS = [
  "status",
  "product_name",
  "product_name_en",
  "abbreviated_product_name",
  "generic_name",
  "brands",
  "image_url",
  "image_front_url",
  "ingredients_text",
  "nutriments",
].join(",");

export async function lookupByUpc(upc: string): Promise<UpcLookup> {
  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json?fields=${OFF_FIELDS}`,
      {
        headers: {
          "User-Agent":
            "Foodpocalypse/0.1 (https://github.com/out-stan-ding-qa/foodpocalypse)",
          Accept: "application/json",
        },
      },
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
    product?: {
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
  const product = data.product;
  const name = [
    product.product_name,
    product.product_name_en,
    product.abbreviated_product_name,
    product.generic_name,
  ]
    .map((value) => value?.trim())
    .find((value) => value);
  if (!name) {
    return { status: "not_found" };
  }
  return {
    status: "found",
    result: {
      name,
      brand: product.brands?.trim() ?? "",
      imageUrl: product.image_front_url || product.image_url || "",
      ingredients: product.ingredients_text?.trim() ?? "",
      nutrition: nutritionFromOffNutriments(product.nutriments),
    },
  };
}

