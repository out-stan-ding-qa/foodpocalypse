<script setup lang="ts">
import { onMounted, ref } from "vue";
import { MapPin, Plus, Store } from "@lucide/vue";
import {
  createStore,
  deleteStore,
  listStores,
  updateStore,
  type Store as StoreRow,
} from "../app-api";

const stores = ref<StoreRow[]>([]);
const name = ref("");
const address = ref("");
const error = ref("");
const editingId = ref<string | null>(null);
const editName = ref("");
const editAddress = ref("");

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

function startEdit(store: StoreRow) {
  editingId.value = store.id;
  editName.value = store.name;
  editAddress.value = store.address;
  error.value = "";
}

function cancelEdit() {
  editingId.value = null;
  editName.value = "";
  editAddress.value = "";
}

async function onSave(store: StoreRow) {
  error.value = "";
  try {
    await updateStore(store.id, editName.value, editAddress.value);
    cancelEdit();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not update store";
  }
}

async function onRemove(store: StoreRow) {
  if (!window.confirm(`Remove ${store.name}?`)) {
    return;
  }
  error.value = "";
  try {
    await deleteStore(store.id);
    if (editingId.value === store.id) {
      cancelEdit();
    }
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not remove store";
  }
}
</script>

<template>
  <div class="stack">
    <p v-if="error" class="error">{{ error }}</p>
    <template v-for="store in stores" :key="store.id">
      <form v-if="editingId === store.id" class="card form" @submit.prevent="onSave(store)">
        <h3>Edit Store</h3>
        <input v-model="editName" required placeholder="Store name (e.g. Local Market)" />
        <input v-model="editAddress" required placeholder="Street address or https://…" />
        <div class="inline">
          <button type="submit">Save</button>
          <button type="button" class="secondary" @click="cancelEdit">Cancel</button>
        </div>
      </form>
      <div v-else class="row-card static">
        <div class="row-main">
          <span class="tile-icon purple"><Store :size="18" /></span>
          <div>
            <strong>{{ store.name }}</strong>
            <p class="muted"><MapPin :size="12" /> {{ store.address }}</p>
          </div>
        </div>
        <div class="row-actions">
          <button class="text-btn" type="button" @click="startEdit(store)">Edit</button>
          <button class="text-btn danger" type="button" @click="onRemove(store)">Remove</button>
        </div>
      </div>
    </template>
    <p v-if="!stores.length" class="muted">No stores yet. Add a shop with a street address or a retailer URL.</p>

    <form class="card form" @submit.prevent="onAdd">
      <h3>Add a Store</h3>
      <p class="muted">A Store is a place you shop: a street address or an https URL. Product listings live on each Product.</p>
      <input v-model="name" required placeholder="Store name (e.g. Local Market)" />
      <input v-model="address" required placeholder="Street address or https://…" />
      <button type="submit"><Plus :size="16" /> Add Store</button>
    </form>
  </div>
</template>
