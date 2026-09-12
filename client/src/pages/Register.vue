<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { HeartPulse } from "@lucide/vue";
import { startRegistration } from "@simplewebauthn/browser";
import {
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  register,
} from "../api";

const router = useRouter();
const email = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function onPasswordRegister() {
  error.value = "";
  busy.value = true;
  try {
    await register(email.value, password.value);
    await router.push("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unable to create account";
  } finally {
    busy.value = false;
  }
}

async function onPasskeyRegister() {
  error.value = "";
  busy.value = true;
  try {
    const { options } = await passkeyRegisterOptions({
      email: email.value,
      password: password.value || undefined,
    });
    const credential = await startRegistration({ optionsJSON: options });
    await passkeyRegisterVerify(credential);
    await router.push("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Passkey registration failed";
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
    <h1>Create account</h1>
    <p class="lede">Email/password and optional passkey — same auth as today.</p>
    <form class="form" @submit.prevent="onPasswordRegister">
      <input v-model="email" type="email" autocomplete="username" required placeholder="Email" />
      <input
        v-model="password"
        type="password"
        autocomplete="new-password"
        minlength="8"
        placeholder="Password (8+ characters)"
      />
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit" :disabled="busy">Create account</button>
      <button type="button" class="secondary" :disabled="busy" @click="onPasskeyRegister">
        Register with passkey
      </button>
    </form>
    <p class="muted center">
      Already have an account?
      <RouterLink to="/login">Log in</RouterLink>
    </p>
  </section>
</template>
