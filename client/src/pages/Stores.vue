<script setup lang="ts">
import { onMounted, ref } from "vue";
import { MapPin, Plus, Store } from "@lucide/vue";
import { createStore, listStores, type Store as StoreRow } from "../app-api";

const stores = ref<StoreRow[]>([]);
const name = ref("");
const address = ref("");
const error = ref("");

async function load() {
  const data = await listStores();
  stores.value = data.stores;
}

onMounted(async () => {
  try {
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load stores";
  }
});

async function onAdd() {
  error.value = "";
  try {
    await createStore(name.value, address.value);
    name.value = "";
    address.value = "";
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not add store";
  }
}
</script>

<template>
  <div class="stack">
    <div v-for="store in stores" :key="store.id" class="row-card static">
      <span class="tile-icon purple"><Store :size="18" /></span>
      <div>
        <strong>{{ store.name }}</strong>
        <p class="muted"><MapPin :size="12" /> {{ store.address }}</p>
      </div>
    </div>
    <p v-if="!stores.length" class="muted">No stores yet. Add a shop with a street address or a retailer URL.</p>

    <form class="card form" @submit.prevent="onAdd">
      <h3>Add a Store</h3>
      <p class="muted">A Store is a place you shop: a street address or an https URL. Product listings live on each Product.</p>
      <input v-model="name" required placeholder="Store name (e.g. Local Market)" />
      <input v-model="address" required placeholder="Street address or https://…" />
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit"><Plus :size="16" /> Add Store</button>
    </form>
  </div>
</template>
