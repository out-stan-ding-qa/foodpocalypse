<script setup lang="ts">
import { onMounted, ref } from "vue";
import { shoppingHistory, type ShoppingList } from "../app-api";

const lists = ref<ShoppingList[]>([]);
const error = ref("");

onMounted(async () => {
  try {
    lists.value = (await shoppingHistory()).lists;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load history";
  }
});

function when(list: ShoppingList) {
  const stamp = list.archivedAt || list.createdAt;
  return new Date(stamp).toLocaleString();
}
</script>

<template>
  <div class="stack">
    <p v-if="error" class="error">{{ error }}</p>
    <p v-else-if="!lists.length" class="muted">No archived lists yet.</p>
    <div v-for="list in lists" :key="list.id" class="card">
      <p class="muted">Archived {{ when(list) }}</p>
      <ul class="plain">
        <li v-for="item in list.items" :key="item.id" :class="{ done: item.checked }">
          {{ item.name }}
        </li>
      </ul>
    </div>
  </div>
</template>
