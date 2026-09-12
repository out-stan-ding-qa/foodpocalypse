<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Plus, Tag } from "@lucide/vue";
import { TRACKED_NUTRIENTS } from "../domain/nutrients";
import {
  addDietNutrient,
  createDiet,
  listDiets,
  patchDiet,
  removeDietNutrient,
  type DietProfile,
} from "../app-api";

const diets = ref<DietProfile[]>([]);
const name = ref("");
const selected = ref<string[]>(["Fiber", "Protein"]);
const error = ref("");
const editingId = ref<string | null>(null);
const editName = ref("");

async function load() {
  diets.value = (await listDiets()).diets;
}

onMounted(async () => {
  try {
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load diets";
  }
});

function toggleSelect(nutrient: string) {
  if (selected.value.includes(nutrient)) {
    selected.value = selected.value.filter((item) => item !== nutrient);
    return;
  }
  selected.value = [...selected.value, nutrient];
}

async function onCreate() {
  error.value = "";
  try {
    await createDiet(name.value, selected.value);
    name.value = "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not create profile";
  }
}

async function toggle(diet: DietProfile) {
  await patchDiet(diet.id, { active: !diet.active });
  await load();
}

async function saveName(diet: DietProfile) {
  await patchDiet(diet.id, { name: editName.value });
  editingId.value = null;
  await load();
}

async function addNutrient(diet: DietProfile, nutrient: string) {
  await addDietNutrient(diet.id, nutrient);
  await load();
}

async function dropNutrient(diet: DietProfile, nutrient: string) {
  await removeDietNutrient(diet.id, nutrient);
  await load();
}

function unused(diet: DietProfile) {
  return TRACKED_NUTRIENTS.filter((nutrient) => !diet.nutrients.includes(nutrient));
}
</script>

<template>
  <div class="stack">
    <p class="muted">
      Each Diet profile is a named set of Tracked nutrients. Toggle it on to use it on Product
      nutrition and Rating bubbles.
    </p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-for="diet in diets" :key="diet.id" class="card">
      <div class="diet-head">
        <button class="switch" :class="{ on: diet.active }" type="button" @click="toggle(diet)">
          <span></span>
        </button>
        <form v-if="editingId === diet.id" class="inline grow" @submit.prevent="saveName(diet)">
          <input v-model="editName" />
          <button type="submit">Save</button>
        </form>
        <h3 v-else>{{ diet.name }}</h3>
        <button
          v-if="editingId !== diet.id"
          class="text-btn"
          type="button"
          @click="editingId = diet.id; editName = diet.name"
        >
          Edit
        </button>
      </div>
      <p class="label">Important Nutrients</p>
      <div class="chips">
        <button
          v-for="nutrient in diet.nutrients"
          :key="nutrient"
          class="tag"
          type="button"
          :title="'Remove'"
          @click="dropNutrient(diet, nutrient)"
        >
          <Tag :size="12" /> {{ nutrient }}
        </button>
        <button
          v-for="nutrient in unused(diet)"
          :key="`add-${nutrient}`"
          class="chip dashed"
          type="button"
          @click="addNutrient(diet, nutrient)"
        >
          <Plus :size="12" /> {{ nutrient }}
        </button>
      </div>
    </div>

    <form class="card form" @submit.prevent="onCreate">
      <h3>Add Diet profile</h3>
      <input v-model="name" required placeholder="e.g. Celiac / Gluten-Free" />
      <p class="label">Tracked nutrients</p>
      <div class="chips">
        <button
          v-for="nutrient in TRACKED_NUTRIENTS"
          :key="nutrient"
          class="chip"
          :class="{ on: selected.includes(nutrient) }"
          type="button"
          @click="toggleSelect(nutrient)"
        >
          {{ nutrient }}
        </button>
      </div>
      <button type="submit"><Plus :size="16" /> Add Diet profile</button>
    </form>
  </div>
</template>
