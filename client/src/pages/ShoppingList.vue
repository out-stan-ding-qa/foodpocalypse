<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Clock, Plus } from "@lucide/vue";
import {
  addShoppingItem,
  archiveShoppingList,
  getShopping,
  listProducts,
  toggleShoppingItem,
  type Product,
  type ShoppingItem,
} from "../app-api";

const items = ref<ShoppingItem[]>([]);
const products = ref<Product[]>([]);
const newItem = ref("");
const showTypeahead = ref(false);
const error = ref("");

const matches = () =>
  products.value.filter((product) =>
    product.name.toLowerCase().includes(newItem.value.trim().toLowerCase()),
  );

async function load() {
  const [shopping, catalog] = await Promise.all([getShopping(), listProducts()]);
  items.value = shopping.items;
  products.value = catalog.products;
}

onMounted(async () => {
  try {
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load list";
  }
});

async function add(name: string, productId?: string) {
  error.value = "";
  await addShoppingItem(name, productId);
  newItem.value = "";
  showTypeahead.value = false;
  await load();
}

async function onAdd() {
  if (!newItem.value.trim()) {
    return;
  }
  try {
    await add(newItem.value.trim());
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not add item";
  }
}

async function toggle(item: ShoppingItem) {
  await toggleShoppingItem(item.id, !item.checked);
  await load();
}

async function archive() {
  error.value = "";
  try {
    await archiveShoppingList();
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not archive list";
  }
}
</script>

<template>
  <div class="stack fill">
    <form class="inline" @submit.prevent="onAdd">
      <div class="grow typeahead">
        <input
          v-model="newItem"
          placeholder="Add an item..."
          @focus="showTypeahead = true"
          @blur="showTypeahead = false"
        />
        <ul v-if="showTypeahead && newItem.trim() && matches().length" class="typeahead-list">
          <li
            v-for="product in matches()"
            :key="product.id"
            @mousedown.prevent="add(product.name, product.id)"
          >
            {{ product.name }}
          </li>
        </ul>
      </div>
      <button type="submit" aria-label="Add"><Plus :size="20" /></button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <div class="card list">
      <button
        v-for="item in items"
        :key="item.id"
        class="check-row"
        type="button"
        @click="toggle(item)"
      >
        <span class="check" :class="{ on: item.checked }"></span>
        <span :class="{ done: item.checked }">{{ item.name }}</span>
      </button>
      <p v-if="!items.length" class="muted center">List is empty</p>
    </div>
    <button class="secondary" type="button" @click="archive">Save to history & start new list</button>
    <RouterLink class="dashed-btn" to="/shopping/history">
      <Clock :size="16" /> View Past Lists
    </RouterLink>
  </div>
</template>
