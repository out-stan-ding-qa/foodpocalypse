<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeft, Home, LogOut } from "@lucide/vue";
import { logout } from "./api";

const route = useRoute();
const router = useRouter();

const isPublic = computed(() => Boolean(route.meta.public));
const title = computed(() => String(route.meta.title || "Foodpocalypse"));
const hideBack = computed(() => Boolean(route.meta.hideBack));

async function onLogout() {
  await logout();
  await router.push("/login");
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  void router.push("/");
}
</script>

<template>
  <div class="phone">
    <header v-if="!isPublic" class="app-header">
      <button v-if="!hideBack" class="icon-btn" type="button" aria-label="Back" @click="goBack">
        <ChevronLeft :size="22" />
      </button>
      <h1>{{ hideBack ? "Foodpocalypse" : title }}</h1>
      <div class="header-actions">
        <RouterLink v-if="route.path !== '/'" class="icon-btn" to="/" aria-label="Home">
          <Home :size="18" />
        </RouterLink>
        <button class="icon-btn" type="button" aria-label="Log out" @click="onLogout">
          <LogOut :size="18" />
        </button>
      </div>
    </header>
    <main class="screen">
      <RouterView />
    </main>
  </div>
</template>
