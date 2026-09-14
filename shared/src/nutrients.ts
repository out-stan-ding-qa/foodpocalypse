export type Nutrient = {
  id: string;
  name: string;
  unit: string;
};

/** Closed Nutrition Facts slice of Open Food Facts nutrient ids. */
export const NUTRIENTS: readonly Nutrient[] = [
  { id: "energy-kcal", name: "Calories", unit: "kcal" },
  { id: "fat", name: "Total Fat", unit: "g" },
  { id: "saturated-fat", name: "Saturated Fat", unit: "g" },
  { id: "trans-fat", name: "Trans Fat", unit: "g" },
  { id: "cholesterol", name: "Cholesterol", unit: "g" },
  { id: "sodium", name: "Sodium", unit: "g" },
  { id: "carbohydrates", name: "Total Carbohydrate", unit: "g" },
  { id: "fiber", name: "Dietary Fiber", unit: "g" },
  { id: "sugars", name: "Total Sugars", unit: "g" },
  { id: "added-sugars", name: "Added Sugars", unit: "g" },
  { id: "proteins", name: "Protein", unit: "g" },
  { id: "vitamin-d", name: "Vitamin D", unit: "g" },
  { id: "calcium", name: "Calcium", unit: "g" },
  { id: "iron", name: "Iron", unit: "g" },
  { id: "potassium", name: "Potassium", unit: "g" },
  { id: "phosphorus", name: "Phosphorus", unit: "g" },
  { id: "magnesium", name: "Magnesium", unit: "g" },
  { id: "zinc", name: "Zinc", unit: "g" },
  { id: "vitamin-a", name: "Vitamin A", unit: "g" },
  { id: "vitamin-c", name: "Vitamin C", unit: "g" },
  { id: "vitamin-e", name: "Vitamin E", unit: "g" },
  { id: "vitamin-k", name: "Vitamin K", unit: "g" },
  { id: "vitamin-b1", name: "Thiamin", unit: "g" },
  { id: "vitamin-b2", name: "Riboflavin", unit: "g" },
  { id: "vitamin-pp", name: "Niacin", unit: "g" },
  { id: "vitamin-b6", name: "Vitamin B6", unit: "g" },
  { id: "vitamin-b9", name: "Folate", unit: "g" },
  { id: "vitamin-b12", name: "Vitamin B12", unit: "g" },
  { id: "biotin", name: "Biotin", unit: "g" },
  { id: "pantothenic-acid", name: "Pantothenic Acid", unit: "g" },
  { id: "copper", name: "Copper", unit: "g" },
  { id: "manganese", name: "Manganese", unit: "g" },
  { id: "selenium", name: "Selenium", unit: "g" },
  { id: "chromium", name: "Chromium", unit: "g" },
  { id: "molybdenum", name: "Molybdenum", unit: "g" },
  { id: "iodine", name: "Iodine", unit: "g" },
  { id: "chloride", name: "Chloride", unit: "g" },
  { id: "choline", name: "Choline", unit: "g" },
];

export type NutrientId = (typeof NUTRIENTS)[number]["id"];

const NUTRIENT_IDS = new Set(NUTRIENTS.map((nutrient) => nutrient.id));
const NUTRIENT_BY_ID = new Map(NUTRIENTS.map((nutrient) => [nutrient.id, nutrient]));

export function isNutrientId(value: string): value is NutrientId {
  return NUTRIENT_IDS.has(value);
}

export function nutrientById(id: string): Nutrient | undefined {
  return NUTRIENT_BY_ID.get(id);
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Slice ids from Open Food Facts nutriments: `_100g`, else unsuffixed. Not `_serving`. */
export function nutritionFromOffNutriments(
  nutriments: Record<string, unknown> | undefined,
): Record<string, number> {
  if (!nutriments) {
    return {};
  }
  const nutrition: Record<string, number> = {};
  for (const nutrient of NUTRIENTS) {
    const value = numberOrNull(nutriments[`${nutrient.id}_100g`] ?? nutriments[nutrient.id]);
    if (value != null) {
      nutrition[nutrient.id] = value;
    }
  }
  return nutrition;
}
