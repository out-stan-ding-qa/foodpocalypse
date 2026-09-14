import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isNutrientId,
  NUTRIENTS,
  nutritionFromOffNutriments,
} from "../src/domain/nutrients.js";

describe("Nutrition Facts slice", () => {
  it("includes potassium and phosphorus as Nutrients", () => {
    assert.equal(isNutrientId("potassium"), true);
    assert.equal(isNutrientId("phosphorus"), true);
    assert.equal(isNutrientId("sodium"), true);
    assert.equal(isNutrientId("proteins"), true);
    assert.equal(isNutrientId("vitamin-b12"), true);
    assert.equal(isNutrientId("energy-kcal"), true);
  });

  it("rejects homemade labels, aliases, and off-slice Open Food Facts ids", () => {
    assert.equal(isNutrientId("Protein"), false);
    assert.equal(isNutrientId("Vitamin B-12"), false);
    assert.equal(isNutrientId("salt"), false);
    assert.equal(isNutrientId("energy"), false);
    assert.equal(isNutrientId("nova-group"), false);
  });

  it("names each Nutrient with an Open Food Facts id, display name, and unit", () => {
    const potassium = NUTRIENTS.find((nutrient) => nutrient.id === "potassium");
    assert.deepEqual(potassium, { id: "potassium", name: "Potassium", unit: "g" });
  });

  it("is the closed Nutrition Facts slice", () => {
    assert.deepEqual(
      NUTRIENTS.map((nutrient) => nutrient.id),
      [
        "energy-kcal",
        "fat",
        "saturated-fat",
        "trans-fat",
        "cholesterol",
        "sodium",
        "carbohydrates",
        "fiber",
        "sugars",
        "added-sugars",
        "proteins",
        "vitamin-d",
        "calcium",
        "iron",
        "potassium",
        "phosphorus",
        "magnesium",
        "zinc",
        "vitamin-a",
        "vitamin-c",
        "vitamin-e",
        "vitamin-k",
        "vitamin-b1",
        "vitamin-b2",
        "vitamin-pp",
        "vitamin-b6",
        "vitamin-b9",
        "vitamin-b12",
        "biotin",
        "pantothenic-acid",
        "copper",
        "manganese",
        "selenium",
        "chromium",
        "molybdenum",
        "iodine",
        "chloride",
        "choline",
      ],
    );
  });
});

describe("nutritionFromOffNutriments", () => {
  it("keeps Nutrition Facts slice ids from _100g, not camelCase aliases", () => {
    const nutrition = nutritionFromOffNutriments({
      "energy-kcal_100g": 48,
      proteins_100g: 1.1,
      potassium_100g: 0.15,
      salt_100g: 0.2,
      "nova-group": 4,
    });
    assert.equal(nutrition["energy-kcal"], 48);
    assert.equal(nutrition.proteins, 1.1);
    assert.equal(nutrition.potassium, 0.15);
    assert.equal(nutrition.salt, undefined);
    assert.equal(nutrition["nova-group"], undefined);
    assert.equal(nutrition.protein, undefined);
    assert.equal(nutrition.calories, undefined);
  });

  it("falls back to the unsuffixed nutriment when _100g is missing", () => {
    const nutrition = nutritionFromOffNutriments({ phosphorus: 0.08 });
    assert.equal(nutrition.phosphorus, 0.08);
  });

  it("does not treat a _serving amount as a different Nutrient", () => {
    const nutrition = nutritionFromOffNutriments({
      proteins_serving: 9,
      "vitamin-b12_serving": 0.001,
    });
    assert.equal(nutrition.proteins, undefined);
    assert.equal(nutrition["vitamin-b12"], undefined);
  });
});
