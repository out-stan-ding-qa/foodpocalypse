<script setup lang="ts">
import { onMounted, ref } from "vue";
import { startRegistration } from "@simplewebauthn/browser";
import {
  getMe,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  type Me,
} from "../api";

const me = ref<Me | null>(null);
const error = ref("");
const message = ref("");
const busy = ref(false);

onMounted(async () => {
  me.value = await getMe();
});

async function addPasskey() {
  error.value = "";
  message.value = "";
  busy.value = true;
  try {
    const { options } = await passkeyRegisterOptions({});
    const credential = await startRegistration({ optionsJSON: options });
    await passkeyRegisterVerify(credential);
    message.value = "Passkey added.";
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not add passkey";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="card">
    <h1>Account</h1>
    <p v-if="me">You are logged in.</p>
    <p v-if="me" class="muted">User ID: {{ me.id }}</p>
    <p v-if="me?.email">Email: {{ me.email }}</p>
    <p v-if="message">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <button type="button" :disabled="busy" @click="addPasskey">Add a passkey</button>
  </section>
</template>
