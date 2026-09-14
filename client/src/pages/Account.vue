<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getAccount, type Account } from "../api";

const account = ref<Account | null>(null);
const error = ref("");

onMounted(async () => {
  try {
    account.value = await getAccount();
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not load account";
  }
});
</script>

<template>
  <section class="card">
    <h1>Account</h1>
    <p v-if="account">You are logged in.</p>
    <p v-if="account" class="muted">User ID: {{ account.id }}</p>
    <p v-if="account?.email">Email: {{ account.email }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>
