<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "../api";
import {
  createProduct,
  listProducts,
  lookupByName,
  lookupUpc,
  type NameLookupResult,
  type Product,
  type UpcResult,
} from "../app-api";

type Mode = "upc" | "name";
type SaveDraft = {
  name: string;
  brand: string;
  ingredients: string;
  upc: string | null;
  imageUrl: string;
  sourceType: string;
  nutrition: Record<string, unknown>;
  listingUrl: string | null;
  notes?: string;
};

const router = useRouter();
const mode = ref<Mode>("upc");
const busy = ref(false);

const upc = ref("");
const upcResult = ref<UpcResult | null>(null);
const upcError = ref("");
const upcStatus = ref("");
const upcDup = ref<{ id: string; name: string; upc: string } | null>(null);

const query = ref("");
const nameResults = ref<NameLookupResult[]>([]);
const nameError = ref("");
const nameStatus = ref("");
const selected = ref<NameLookupResult | null>(null);
const editName = ref("");
const showManual = ref(false);
const manualName = ref("");
const manualBrand = ref("");
const manualNotes = ref("");
const nameDupes = ref<Array<{ id: string; name: string }>>([]);
const nutritionWarn = ref("");
const nameUpcDup = ref<{ id: string; name: string; upc: string } | null>(null);

const catalog = ref<Product[]>([]);

const nameUnique = computed(() => {
  const key = normalizeName(editName.value);
  if (!key) {
    return false;
  }
  return !catalog.value.some((product) => normalizeName(product.name) === key);
});

const manualUnique = computed(() => {
  const key = normalizeName(manualName.value);
  if (!key) {
    return false;
  }
  return !catalog.value.some((product) => normalizeName(product.name) === key);
});

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function nutritionEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  const left = a ?? {};
  const right = b ?? {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  if (keys.size === 0) {
    return false;
  }
  for (const key of keys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }
  return true;
}

async function refreshCatalog() {
  try {
    const data = await listProducts();
    catalog.value = data.products;
  } catch {
    catalog.value = [];
  }
}

function setMode(next: Mode) {
  mode.value = next;
  upcError.value = "";
  upcStatus.value = "";
  nameError.value = "";
  nameStatus.value = "";
  nutritionWarn.value = "";
}

async function onUpcLookup() {
  upcError.value = "";
  upcStatus.value = "";
  upcDup.value = null;
  busy.value = true;
  try {
    const data = await lookupUpc(upc.value);
    upcResult.value = data.result;
  } catch (err) {
    upcResult.value = null;
    upcError.value = err instanceof Error ? err.message : "UPC lookup failed";
  } finally {
    busy.value = false;
  }
}

async function saveDraft(draft: SaveDraft, opts: { mode: Mode }) {
  await refreshCatalog();
  const key = normalizeName(draft.name);
  const conflicts = catalog.value.filter(
    (product) => normalizeName(product.name) === key,
  );
  if (conflicts.length > 0) {
    nameDupes.value = conflicts.map((product) => ({
      id: product.id,
      name: product.name,
    }));
    throw new Error("A product with this name already exists");
  }
  nameDupes.value = [];

  const twin = catalog.value.find((product) =>
    nutritionEqual(product.nutrition, draft.nutrition),
  );
  nutritionWarn.value = twin
    ? `Nutrition matches saved Product “${twin.name}”. You can still save with a different name.`
    : "";

  try {
    await createProduct({
      name: draft.name.trim(),
      brand: draft.brand || null,
      ingredients: draft.ingredients,
      upc: draft.upc,
      imageUrl: draft.imageUrl || null,
      sourceType: draft.sourceType,
      nutrition: draft.nutrition,
      listingUrl: draft.listingUrl,
      notes: draft.notes ?? "",
    });
    if (opts.mode === "upc") {
      upcDup.value = null;
      upcStatus.value = "Saved to your products.";
    } else {
      nameUpcDup.value = null;
      nameStatus.value = "Saved to your products.";
    }
    await refreshCatalog();
  } catch (err) {
    if (err instanceof ApiError) {
      const existing = err.body.existingProduct as
        | { id: string; name: string; upc: string }
        | undefined;
      if (existing && err.message.includes("UPC")) {
        if (opts.mode === "upc") {
          upcDup.value = existing;
        } else {
          nameUpcDup.value = existing;
        }
      }
      const existingNames = err.body.existingProducts as
        | Array<{ id: string; name: string }>
        | undefined;
      if (existingNames?.length) {
        nameDupes.value = existingNames;
      }
    }
    throw err;
  }
}

async function saveUpc(omitUpc = false) {
  if (!upcResult.value) {
    return;
  }
  busy.value = true;
  upcStatus.value = "";
  try {
    await saveDraft(
      {
        name: upcResult.value.name,
        brand: upcResult.value.brand,
        ingredients: upcResult.value.ingredients,
        upc: omitUpc ? null : upcResult.value.upc,
        imageUrl: upcResult.value.imageUrl,
        sourceType: "upc",
        nutrition: upcResult.value.nutrition,
        listingUrl: upcResult.value.listingUrl,
      },
      { mode: "upc" },
    );
  } catch (err) {
    upcStatus.value = err instanceof Error ? err.message : "Could not save";
  } finally {
    busy.value = false;
  }
}

async function onNameLookup() {
  nameError.value = "";
  nameStatus.value = "";
  selected.value = null;
  nameUpcDup.value = null;
  nameDupes.value = [];
  nutritionWarn.value = "";
  busy.value = true;
  try {
    const data = await lookupByName(query.value);
    nameResults.value = data.results;
    if (data.results.length === 0) {
      nameError.value = "No matches. Try another query or add manually.";
      showManual.value = true;
    }
  } catch (err) {
    nameResults.value = [];
    nameError.value = err instanceof Error ? err.message : "Name lookup failed";
    showManual.value = true;
  } finally {
    busy.value = false;
  }
}

function pickResult(result: NameLookupResult) {
  selected.value = result;
  editName.value = result.name;
  nameDupes.value = [];
  nameUpcDup.value = null;
  nameStatus.value = "";
  void refreshCatalog().then(() => {
    const twin = catalog.value.find((product) =>
      nutritionEqual(product.nutrition, result.nutrition),
    );
    nutritionWarn.value = twin
      ? `Nutrition matches saved Product “${twin.name}”. Choose a distinct name if you still want to save.`
      : "";
  });
}

async function saveSelected(omitUpc = false) {
  if (!selected.value) {
    return;
  }
  busy.value = true;
  nameStatus.value = "";
  try {
    await saveDraft(
      {
        name: editName.value,
        brand: selected.value.brand,
        ingredients: selected.value.ingredients,
        upc: omitUpc ? null : selected.value.upc,
        imageUrl: selected.value.imageUrl,
        sourceType: "off-search",
        nutrition: selected.value.nutrition,
        listingUrl: selected.value.listingUrl,
      },
      { mode: "name" },
    );
  } catch (err) {
    nameStatus.value = err instanceof Error ? err.message : "Could not save";
  } finally {
    busy.value = false;
  }
}

async function saveManual() {
  busy.value = true;
  nameStatus.value = "";
  nameDupes.value = [];
  try {
    await saveDraft(
      {
        name: manualName.value,
        brand: manualBrand.value,
        ingredients: "",
        upc: null,
        imageUrl: "",
        sourceType: "manual",
        nutrition: {},
        listingUrl: null,
        notes: manualNotes.value,
      },
      { mode: "name" },
    );
    manualName.value = "";
    manualBrand.value = "";
    manualNotes.value = "";
  } catch (err) {
    nameStatus.value = err instanceof Error ? err.message : "Could not save";
  } finally {
    busy.value = false;
  }
}

void refreshCatalog();
</script>

<template>
  <div class="stack">
    <p class="muted">Add a packaged Product by UPC or by name.</p>

    <div class="segment" role="tablist" aria-label="Lookup mode">
      <button
        type="button"
        role="tab"
        class="segment-btn"
        :class="{ active: mode === 'upc' }"
        :aria-selected="mode === 'upc'"
        @click="setMode('upc')"
      >
        By UPC
      </button>
      <button
        type="button"
        role="tab"
        class="segment-btn"
        :class="{ active: mode === 'name' }"
        :aria-selected="mode === 'name'"
        @click="setMode('name')"
      >
        By name
      </button>
    </div>

    <form v-if="mode === 'upc'" class="card form" @submit.prevent="onUpcLookup">
      <input v-model="upc" required placeholder="Enter UPC code" />
      <button type="submit" :disabled="busy">Lookup</button>
      <p v-if="upcError" class="error">{{ upcError }}</p>
      <div v-if="upcResult" class="result">
        <p>
          <strong>{{ upcResult.name }}</strong>
        </p>
        <p class="muted">{{ upcResult.brand || "No brand" }}</p>
        <pre>{{ JSON.stringify(upcResult.nutrition, null, 2) }}</pre>
        <button type="button" :disabled="busy" @click="saveUpc(false)">Save Product</button>
        <div v-if="upcDup" class="warn-box">
          <p class="error">{{ upcStatus }}</p>
          <p class="muted">
            Existing:
            <a href="#" @click.prevent="router.push(`/products/${upcDup.id}`)">{{
              upcDup.name
            }}</a>
          </p>
          <button type="button" class="secondary" :disabled="busy" @click="saveUpc(true)">
            Save without UPC
          </button>
        </div>
        <p v-else-if="upcStatus" class="muted">{{ upcStatus }}</p>
        <p v-if="nutritionWarn && mode === 'upc'" class="muted">{{ nutritionWarn }}</p>
      </div>
    </form>

    <div v-else class="stack">
      <form class="card form" @submit.prevent="onNameLookup">
        <input v-model="query" required placeholder="Search by name or brand" />
        <button type="submit" :disabled="busy">Search</button>
        <p v-if="nameError" class="error">{{ nameError }}</p>
      </form>

      <div v-if="nameResults.length" class="card">
        <p class="muted">Pick a match</p>
        <button
          v-for="(hit, index) in nameResults"
          :key="`${hit.upc ?? hit.name}-${index}`"
          type="button"
          class="hit"
          :class="{ active: selected === hit }"
          @click="pickResult(hit)"
        >
          <strong>{{ hit.name }}</strong>
          <span class="muted">{{ hit.brand || "No brand" }}</span>
        </button>
      </div>

      <div v-if="selected" class="card form result">
        <label>
          Name
          <input v-model="editName" required />
        </label>
        <p class="muted">{{ selected.brand || "No brand" }}</p>
        <pre>{{ JSON.stringify(selected.nutrition, null, 2) }}</pre>
        <p v-if="nutritionWarn" class="muted">{{ nutritionWarn }}</p>
        <p v-if="!nameUnique" class="error">
          Choose a different name — you already have a Product with this name.
        </p>
        <ul v-if="nameDupes.length" class="dupe-list">
          <li v-for="dupe in nameDupes" :key="dupe.id">
            <a href="#" @click.prevent="router.push(`/products/${dupe.id}`)">{{ dupe.name }}</a>
          </li>
        </ul>
        <button type="button" :disabled="busy || !nameUnique" @click="saveSelected(false)">
          Save Product
        </button>
        <div v-if="nameUpcDup" class="warn-box">
          <p class="error">A product with this UPC already exists</p>
          <p class="muted">
            Existing:
            <a href="#" @click.prevent="router.push(`/products/${nameUpcDup.id}`)">{{
              nameUpcDup.name
            }}</a>
          </p>
          <button
            type="button"
            class="secondary"
            :disabled="busy || !nameUnique"
            @click="saveSelected(true)"
          >
            Save without UPC
          </button>
        </div>
        <p v-else-if="nameStatus" class="muted">{{ nameStatus }}</p>
      </div>

      <div class="card form">
        <button type="button" class="secondary" @click="showManual = !showManual">
          {{ showManual ? "Hide manual entry" : "Can’t find it? Add manually" }}
        </button>
        <template v-if="showManual">
          <input v-model="manualName" required placeholder="Product name" />
          <input v-model="manualBrand" placeholder="Brand (optional)" />
          <textarea v-model="manualNotes" rows="3" placeholder="Notes (optional)" />
          <p v-if="manualName && !manualUnique" class="error">
            Choose a different name — you already have a Product with this name.
          </p>
          <button type="button" :disabled="busy || !manualUnique" @click="saveManual">
            Save Product
          </button>
          <p v-if="nameStatus && !selected" class="muted">{{ nameStatus }}</p>
        </template>
      </div>
    </div>
  </div>
</template>
