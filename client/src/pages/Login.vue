<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { HeartPulse } from "@lucide/vue";
import { login } from "../api";

const router = useRouter();
const email = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function onPasswordLogin() {
  error.value = "";
  busy.value = true;
  try {
    await login(email.value, password.value);
    await router.push("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to sign in";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="auth-screen">
    <div class="brand-mark">
      <HeartPulse :size="32" color="white" />
    </div>
    <h1>Foodpocalypse</h1>
    <p class="lede">Your personal diet & grocery assistant</p>
    <form class="form" @submit.prevent="onPasswordLogin">
      <input v-model="email" type="email" autocomplete="username" placeholder="Email" />
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
        placeholder="Password"
      />
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="busy">Log in</button>
    </form>
    <p class="muted center">
      New here?
      <RouterLink to="/register">Create an account</RouterLink>
    </p>
  </section>
</template>
