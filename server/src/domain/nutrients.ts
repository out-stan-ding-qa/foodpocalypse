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

export function isTrackedNutrient(value: string): value is TrackedNutrient {
  return (TRACKED_NUTRIENTS as readonly string[]).includes(value);
}
