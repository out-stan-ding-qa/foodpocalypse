<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ChevronRight, Search } from "@lucide/vue";
import { listProducts, type Product } from "../app-api";

const products = ref<Product[]>([]);
const query = ref("");
const error = ref("");

const filtered = computed(() =>
  products.value.filter((product) =>
    product.name.toLowerCase().includes(query.value.trim().toLowerCase()),
  ),
);

onMounted(async () => {
  try {
    const data = await listProducts();
    products.value = data.products;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load products";
  }
});
</script>

<template>
  <div class="stack">
    <div class="search">
      <Search class="search-icon" :size="18" />
      <input v-model="query" type="search" placeholder="Search products..." />
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="filtered.length === 0" class="muted">No saved products yet.</p>
    <button
      v-for="product in filtered"
      :key="product.id"
      class="row-card"
      type="button"
      @click="$router.push(`/products/${product.id}`)"
    >
      <div>
        <strong>{{ product.name }}</strong>
        <p class="muted">{{ product.storeIds?.length ?? 0 }} stores linked</p>
      </div>
      <ChevronRight :size="18" />
    </button>
    <RouterLink class="dashed-btn" to="/capture">
      <Search :size="18" /> Lookup New Product
    </RouterLink>
  </div>
</template>
