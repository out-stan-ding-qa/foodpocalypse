export type UpcLookupResult = {
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  nutrition: Record<string, number | string | null>;
};

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapNutrition(nutriments: Record<string, unknown> | undefined): Record<string, number | string | null> {
  if (!nutriments) {
    return {};
  }
  return {
    calories: numberOrNull(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"]),
    fat: numberOrNull(nutriments.fat_100g ?? nutriments.fat),
    carbs: numberOrNull(nutriments.carbohydrates_100g ?? nutriments.carbohydrates),
    fiber: numberOrNull(nutriments.fiber_100g ?? nutriments.fiber),
    sugar: numberOrNull(nutriments.sugars_100g ?? nutriments.sugars),
    protein: numberOrNull(nutriments.proteins_100g ?? nutriments.proteins),
    sodium: numberOrNull(nutriments.sodium_100g ?? nutriments.sodium),
    iron: numberOrNull(nutriments.iron_100g ?? nutriments.iron),
    calcium: numberOrNull(nutriments.calcium_100g ?? nutriments.calcium),
    vitaminB12: numberOrNull(
      nutriments["vitamin-b12_100g"] ?? nutriments["vitamin-b12"],
    ),
  };
}

export async function lookupByUpc(upc: string): Promise<UpcLookupResult | null> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json`,
    {
      headers: {
        "User-Agent": "Foodpocalypse/0.1 (diet manager)",
        Accept: "application/json",
      },
    },
  );
  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      image_url?: string;
      image_front_url?: string;
      ingredients_text?: string;
      nutriments?: Record<string, unknown>;
    };
  };
  if (data.status !== 1 || !data.product) {
    return null;
  }
  const product = data.product;
  const name = product.product_name?.trim();
  if (!name) {
    return null;
  }
  return {
    name,
    brand: product.brands?.trim() ?? "",
    imageUrl: product.image_front_url || product.image_url || "",
    ingredients: product.ingredients_text?.trim() ?? "",
    nutrition: mapNutrition(product.nutriments),
  };
}

