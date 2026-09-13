<script setup lang="ts">
import { onMounted, ref } from "vue";
import { HeartPulse, List, Search, Store, User } from "@lucide/vue";
import { getMe, type Me } from "../api";
import { getShopping } from "../app-api";

const me = ref<Me | null>(null);
const remaining = ref(0);

const greeting = () => {
  const email = me.value?.email;
  if (!email) {
    return "there";
  }
  return email.split("@")[0] || "there";
};

onMounted(async () => {
  me.value = await getMe();
  const shopping = await getShopping();
  remaining.value = shopping.items.filter((item) => !item.checked).length;
});
</script>

<template>
  <div>
    <div class="hero">
      <div>
        <h2>Hello, {{ greeting() }}</h2>
        <p>Ready to track products and shop?</p>
      </div>
      <RouterLink class="avatar" to="/account" aria-label="Account">
        <User :size="20" />
      </RouterLink>
    </div>

    <div class="tile-grid">
      <RouterLink class="tile" to="/products">
        <span class="tile-icon orange"><Search :size="22" /></span>
        Products
      </RouterLink>
      <RouterLink class="tile" to="/stores">
        <span class="tile-icon purple"><Store :size="22" /></span>
        Stores
      </RouterLink>
      <RouterLink class="tile" to="/shopping">
        <span class="tile-icon green"><List :size="22" /></span>
        Shopping List
      </RouterLink>
      <RouterLink class="tile" to="/diet-profiles">
        <span class="tile-icon red"><HeartPulse :size="22" /></span>
        Diet Profiles
      </RouterLink>
    </div>

    <div v-if="remaining > 0" class="info-banner">
      You have {{ remaining }} item{{ remaining === 1 ? "" : "s" }} left on your current shopping
      list. Tap Shopping List to view.
    </div>
  </div>
</template>
