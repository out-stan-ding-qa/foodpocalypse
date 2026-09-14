# Nutrient identity is Open Food Facts ids

A Nutrient is an Open Food Facts nutrient id plus a unit and display name. Diet profiles and Product nutrition use the same ids (`potassium`, not `Potassium` or `protein`). The picker is a Nutrition Facts slice of that taxonomy, not FDA names and not the full ~140 OFF ids.

## Considered Options

- Homemade display names (`Fiber`, `Vitamin B-12`) mapped onto a camelCase bag
- FDA Daily Value names as identity
- The full Open Food Facts nutrient taxonomy
- A Nutrition Facts slice of OFF ids — **chosen**

One id each for aliases: `sodium` not `salt`; `energy-kcal` not `energy` / `energy-kj`; `vitamin-b9` not `folates`; `vitamin-k` not `phylloquinone`; `proteins` not crude protein. Amounts stay as OFF reports them (`_100g`, else unsuffixed); `_serving` is not a different Nutrient.
