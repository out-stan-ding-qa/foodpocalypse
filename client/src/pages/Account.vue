<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getMe, type Me } from "../api";

const me = ref<Me | null>(null);
const error = ref("");

onMounted(async () => {
  try {
    me.value = await getMe();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load account";
  }
});
</script>

<template>
  <section class="card">
    <h1>Account</h1>
    <p v-if="me">You are logged in.</p>
    <p v-if="me" class="muted">User ID: {{ me.id }}</p>
    <p v-if="me?.email">Email: {{ me.email }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
