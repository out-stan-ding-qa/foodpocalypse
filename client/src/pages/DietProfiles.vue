<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Plus, Tag } from "@lucide/vue";
import {
  addDietProfileNutrient,
  createDietProfile,
  listDietProfiles,
  listNutrients,
  patchDietProfile,
  removeDietProfileNutrient,
  type DietProfile,
  type Nutrient,
} from "../app-api";

const catalog = ref<Nutrient[]>([]);
const profiles = ref<DietProfile[]>([]);
const name = ref("");
const selected = ref<string[]>(["fiber", "proteins"]);
const error = ref("");
const editingId = ref<string | null>(null);
const editName = ref("");

function nutrientName(id: string) {
  return catalog.value.find((nutrient) => nutrient.id === id)?.name ?? id;
}

async function load() {
  const [nutrients, diet] = await Promise.all([listNutrients(), listDietProfiles()]);
  catalog.value = nutrients.nutrients;
  profiles.value = diet.dietProfiles;
}

onMounted(async () => {
  try {
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load Diet profiles";
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
    await createDietProfile(name.value, selected.value);
    name.value = "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not create Diet profile";
  }
}

async function toggle(profile: DietProfile) {
  await patchDietProfile(profile.id, { active: !profile.active });
  await load();
}

async function saveName(profile: DietProfile) {
  await patchDietProfile(profile.id, { name: editName.value });
  editingId.value = null;
  await load();
}

async function addNutrient(profile: DietProfile, nutrient: string) {
  await addDietProfileNutrient(profile.id, nutrient);
  await load();
}

async function dropNutrient(profile: DietProfile, nutrient: string) {
  await removeDietProfileNutrient(profile.id, nutrient);
  await load();
}

function untrackedNutrients(profile: DietProfile) {
  return catalog.value.filter((nutrient) => !profile.nutrients.includes(nutrient.id));
}
</script>

<template>
  <div class="stack">
    <p class="muted">
      Each Diet profile is a named set of Tracked nutrients. Toggle it on to use it on Product
      nutrition and Rating bubbles.
    </p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-for="profile in profiles" :key="profile.id" class="card">
      <div class="diet-profile-head">
        <button class="switch" :class="{ on: profile.active }" type="button" @click="toggle(profile)">
          <span></span>
        </button>
        <form v-if="editingId === profile.id" class="inline grow" @submit.prevent="saveName(profile)">
          <input v-model="editName" />
          <button type="submit">Save</button>
        </form>
        <h3 v-else>{{ profile.name }}</h3>
        <button
          v-if="editingId !== profile.id"
          class="text-btn"
          type="button"
          @click="editingId = profile.id; editName = profile.name"
        >
          Edit
        </button>
      </div>
      <p class="label">Tracked nutrients</p>
      <div class="chips">
        <button
          v-for="nutrient in profile.nutrients"
          :key="nutrient"
          class="tag"
          type="button"
          :title="'Remove'"
          @click="dropNutrient(profile, nutrient)"
        >
          <Tag :size="12" /> {{ nutrientName(nutrient) }}
        </button>
        <button
          v-for="nutrient in untrackedNutrients(profile)"
          :key="`add-${nutrient.id}`"
          class="chip dashed"
          type="button"
          @click="addNutrient(profile, nutrient.id)"
        >
          <Plus :size="12" /> {{ nutrient.name }}
        </button>
      </div>
    </div>

    <form class="card form" @submit.prevent="onCreate">
      <h3>Add Diet profile</h3>
      <input v-model="name" required placeholder="e.g. Celiac / Gluten-Free" />
      <p class="label">Tracked nutrients</p>
      <div class="chips">
        <button
          v-for="nutrient in catalog"
          :key="nutrient.id"
          class="chip"
          :class="{ on: selected.includes(nutrient.id) }"
          type="button"
          @click="toggleSelect(nutrient.id)"
        >
          {{ nutrient.name }}
        </button>
      </div>
      <button type="submit"><Plus :size="16" /> Add Diet profile</button>
    </form>
  </div>
</template>
