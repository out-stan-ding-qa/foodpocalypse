export const TRACKED_NUTRIENTS = [
  "Fiber",
  "Iron",
  "Vitamin B-12",
  "Protein",
  "Calcium",
] as const;

export type TrackedNutrient = (typeof TRACKED_NUTRIENTS)[number];

export const NUTRITION_LABEL_TO_KEY: Record<TrackedNutrient, string> = {
  Fiber: "fiber",
  Iron: "iron",
  "Vitamin B-12": "vitaminB12",
  Protein: "protein",
  Calcium: "calcium",
};

export const NUTRITION_KEY_UNITS: Record<string, string> = {
  calories: "kcal",
  fat: "g",
  carbs: "g",
  fiber: "g",
  sugar: "g",
  protein: "g",
  sodium: "g",
  iron: "mg",
  calcium: "mg",
  vitaminB12: "µg",
};
