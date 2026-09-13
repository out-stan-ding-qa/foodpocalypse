export {
  NUTRITION_LABEL_TO_KEY,
  TRACKED_NUTRIENTS,
  isTrackedNutrient,
  type TrackedNutrient,
} from "@foodpocalypse/domain/nutrients";

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
