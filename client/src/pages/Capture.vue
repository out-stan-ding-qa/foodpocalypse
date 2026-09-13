<script setup lang="ts">
import { ref } from "vue";
import { createProduct, lookupUpc, type UpcResult } from "../app-api";

const upc = ref("");
const upcResult = ref<UpcResult | null>(null);
const upcError = ref("");
const upcStatus = ref("");
const busy = ref(false);

async function onUpcLookup() {
  upcError.value = "";
  upcStatus.value = "";
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

async function saveUpc() {
  if (!upcResult.value) {
    return;
  }
  busy.value = true;
  upcStatus.value = "";
  try {
    await createProduct({
      name: upcResult.value.name,
      brand: upcResult.value.brand,
      ingredients: upcResult.value.ingredients,
      upc: upcResult.value.upc,
      imageUrl: upcResult.value.imageUrl,
      sourceType: "upc",
      nutrition: upcResult.value.nutrition,
      listingUrl: upcResult.value.listingUrl,
    });
    upcStatus.value = "Saved to your products.";
  } catch (err) {
    upcStatus.value = err instanceof Error ? err.message : "Could not save";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="stack">
    <p class="muted">Look up a packaged food by UPC.</p>
    <form class="card form" @submit.prevent="onUpcLookup">
      <input v-model="upc" required placeholder="Enter UPC code" />
      <button type="submit" :disabled="busy">Lookup</button>
      <p v-if="upcError" class="error">{{ upcError }}</p>
      <div v-if="upcResult" class="result">
        <p><strong>{{ upcResult.name }}</strong></p>
        <p class="muted">{{ upcResult.brand || "No brand" }}</p>
        <pre>{{ JSON.stringify(upcResult.nutrition, null, 2) }}</pre>
        <button type="button" :disabled="busy" @click="saveUpc">Save Product</button>
        <p v-if="upcStatus" class="muted">{{ upcStatus }}</p>
      </div>
    </form>
  </div>
</template>
