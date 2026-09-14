<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { MapPin, Star, Undo2 } from "@lucide/vue";
import {
  markAnnouncement,
  markKind,
  nextRating,
  resetActionName,
  type TrafficLight,
} from "../domain/mark";
import {
  NUTRITION_KEY_UNITS,
  NUTRITION_LABEL_TO_KEY,
  type TrackedNutrient,
} from "../domain/nutrients";
import {
  getProduct,
  linkStore,
  setProductRating,
  updateProduct,
  type DietProfile,
  type Product,
  type Store,
} from "../app-api";

type Chip = {
  dietProfileId: string;
  name: string;
  rating: TrafficLight | null;
  recommendation: TrafficLight | null;
};

const route = useRoute();
const product = ref<Product | null>(null);
const stores = ref<Store[]>([]);
const unlinked = ref<Store[]>([]);
const ratings = ref<
  Array<{
    dietProfileId: string;
    rating: TrafficLight | null;
    recommendation: TrafficLight | null;
    mark: TrafficLight | null;
    dietProfile: DietProfile | null;
  }>
>([]);
const profiles = ref<DietProfile[]>([]);
const error = ref("");
const listingUrl = ref("");
const amountGrams = ref(100);
const showAll = ref(false);

function scale(value: unknown): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value == null ? "N/A" : String(value);
  }
  return ((value * amountGrams.value) / 100).toFixed(1);
}

const visibleNutrients = computed(() => {
  const nutrition = product.value?.nutrition ?? {};
  const activeLabels = profiles.value
    .filter((profile) => profile.active)
    .flatMap((profile) => profile.nutrients);
  const keys = new Set<string>(["calories"]);
  for (const label of activeLabels) {
    if (label in NUTRITION_LABEL_TO_KEY) {
      keys.add(NUTRITION_LABEL_TO_KEY[label as TrackedNutrient]);
    }
  }
  const allKeys = Object.keys(nutrition);
  const selected = showAll.value ? allKeys : allKeys.filter((key) => keys.has(key) || key === "calories");
  return selected.map((key) => ({
    key,
    value: nutrition[key],
    unit: NUTRITION_KEY_UNITS[key] || "",
  }));
});

const chips = computed((): Chip[] =>
  profiles.value
    .filter((profile) => profile.active)
    .map((profile) => {
      const row = ratings.value.find((rating) => rating.dietProfileId === profile.id);
      return {
        dietProfileId: profile.id,
        name: profile.name,
        rating: row?.rating ?? null,
        recommendation: row?.recommendation ?? null,
      };
    }),
);

function bubbleClass(chip: Chip) {
  const kind = markKind(chip.rating, chip.recommendation);
  if (kind === "empty") {
    return "empty";
  }
  if (kind === "recommendation") {
    return ["rec", chip.recommendation];
  }
  return chip.rating;
}

async function load() {
  const id = String(route.params.id);
  const data = await getProduct(id);
  product.value = data.product;
  stores.value = data.stores;
  unlinked.value = data.unlinkedStores;
  ratings.value = data.ratings;
  profiles.value = data.dietProfiles;
  listingUrl.value = data.product.listingUrl ?? "";
}

onMounted(async () => {
  try {
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load product";
  }
});

async function onChip(chip: Chip) {
  const kind = markKind(chip.rating, chip.recommendation);
  const next = kind === "rating" && chip.rating ? nextRating(chip.rating) : "yellow";
  await setProductRating(String(route.params.id), chip.dietProfileId, next);
  await load();
}

async function resetChip(chip: Chip) {
  await setProductRating(String(route.params.id), chip.dietProfileId, null);
  await load();
}

async function addStore(storeId: string) {
  await linkStore(String(route.params.id), storeId);
  await load();
}

async function saveListing() {
  await updateProduct(String(route.params.id), { listingUrl: listingUrl.value || null });
  await load();
}
</script>

<template>
  <div v-if="error" class="error">{{ error }}</div>
  <div v-else-if="product" class="stack">
    <div class="card">
      <img v-if="product.imageUrl" :src="product.imageUrl" alt="" class="thumb" />
      <h2>{{ product.name }}</h2>
      <p class="muted">UPC: {{ product.upc || "None" }}</p>
      <p v-if="product.brand" class="muted">Brand: {{ product.brand }}</p>
      <p class="muted">{{ product.ingredients || "No ingredients" }}</p>

      <div class="bubbles">
        <span v-for="chip in chips" :key="chip.dietProfileId" class="bubble-row">
          <button
            class="bubble"
            :class="bubbleClass(chip)"
            type="button"
            :aria-label="markAnnouncement(chip.name, chip.rating, chip.recommendation)"
            @click="onChip(chip)"
          >
            <Star
              v-if="markKind(chip.rating, chip.recommendation) === 'recommendation'"
              :size="14"
              aria-hidden="true"
            />
            {{ chip.name }}
          </button>
          <button
            v-if="markKind(chip.rating, chip.recommendation) === 'rating'"
            class="bubble-reset"
            type="button"
            :aria-label="resetActionName(chip.recommendation)"
            @click="resetChip(chip)"
          >
            <Undo2 :size="16" aria-hidden="true" />
          </button>
        </span>
      </div>

      <div class="nutrition">
        <div class="nutrition-head">
          <span>Nutrition (per amount)</span>
          <label>
            Amount (g)
            <input v-model.number="amountGrams" type="number" min="0" class="weight" />
          </label>
        </div>
        <div v-for="row in visibleNutrients" :key="row.key" class="nutrient-row">
          <span>{{ row.key }}</span>
          <span>{{ scale(row.value) }} {{ row.unit }}</span>
        </div>
        <button class="text-btn" type="button" @click="showAll = !showAll">
          {{ showAll ? "Show Less" : "More Info (Full Nutrients)" }}
        </button>
      </div>
    </div>

    <div class="card">
      <h3><MapPin :size="16" /> Listing</h3>
      <form class="inline" @submit.prevent="saveListing">
        <input v-model="listingUrl" type="url" placeholder="Product page or search URL" />
        <button type="submit">Save</button>
      </form>
      <a v-if="product.listingUrl" :href="product.listingUrl" target="_blank" rel="noreferrer">
        Open listing
      </a>
    </div>

    <div class="card">
      <h3><MapPin :size="16" /> Available at these stores</h3>
      <ul v-if="stores.length" class="plain">
        <li v-for="store in stores" :key="store.id">
          <strong>{{ store.name }}</strong>
          <p class="muted">{{ store.address }}</p>
        </li>
      </ul>
      <p v-else class="muted">No stores linked to this product yet.</p>
      <div v-if="unlinked.length" class="add-bubbles">
        <span class="muted">Quick link a store:</span>
        <button
          v-for="store in unlinked"
          :key="store.id"
          class="chip"
          type="button"
          @click="addStore(store.id)"
        >
          + {{ store.name }}
        </button>
      </div>
      <RouterLink class="secondary-link" to="/stores">Manage All Stores</RouterLink>
    </div>
  </div>
</template>
