<script setup lang="ts">
import { ref } from "vue";
import { recognize } from "tesseract.js";
import { createProduct, lookupUpc, parsePhoto, type PhotoResult, type UpcResult } from "../app-api";

const upc = ref("");
const upcResult = ref<UpcResult | null>(null);
const upcError = ref("");
const upcStatus = ref("");

const photoFile = ref<File | null>(null);
const thumbnail = ref("");
const ocrText = ref("");
const photoResult = ref<PhotoResult | null>(null);
const photoError = ref("");
const photoName = ref("");
const photoStatus = ref("");
const busy = ref(false);
const tab = ref<"upc" | "photo">("upc");

const MAX_BYTES = 5 * 1024 * 1024;

async function fileToJpegDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const size = 140;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not read image");
  }
  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.7);
}

async function detectUpcFromImage(file: File): Promise<string | undefined> {
  const Detector = (
    window as Window & {
      BarcodeDetector?: new (options: { formats: string[] }) => {
        detect: (image: ImageBitmap) => Promise<Array<{ rawValue?: string }>>;
      };
    }
  ).BarcodeDetector;
  if (!Detector) {
    return undefined;
  }
  try {
    const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    const imageBitmap = await createImageBitmap(file);
    const barcodes = await detector.detect(imageBitmap);
    imageBitmap.close();
    return barcodes[0]?.rawValue?.trim();
  } catch {
    return undefined;
  }
}

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
      amazonUrl: upcResult.value.amazonUrl,
    });
    upcStatus.value = "Saved to your products.";
  } catch (err) {
    upcStatus.value = err instanceof Error ? err.message : "Could not save";
  } finally {
    busy.value = false;
  }
}

async function onPhoto() {
  photoError.value = "";
  photoStatus.value = "";
  if (!photoFile.value) {
    photoError.value = "Upload a photo first.";
    return;
  }
  if (photoFile.value.size > MAX_BYTES) {
    photoError.value = "Photo must be 5MB or less.";
    return;
  }
  busy.value = true;
  try {
    const detectedUpc = await detectUpcFromImage(photoFile.value);
    const extractedText =
      ocrText.value.trim() || (await recognize(photoFile.value, "eng")).data.text || "";
    ocrText.value = extractedText;
    const data = await parsePhoto({
      extractedText,
      detectedUpc,
      thumbnailDataUrl: thumbnail.value,
    });
    photoResult.value = data.result;
    photoName.value = data.result.name ?? "";
  } catch (err) {
    photoResult.value = null;
    photoError.value = err instanceof Error ? err.message : "Photo parse failed";
  } finally {
    busy.value = false;
  }
}

async function savePhoto() {
  if (!photoResult.value || !photoName.value.trim()) {
    photoStatus.value = "Food name is required";
    return;
  }
  busy.value = true;
  try {
    await createProduct({
      name: photoName.value.trim(),
      upc: photoResult.value.upc ?? undefined,
      brand: photoResult.value.brand ?? undefined,
      ingredients: photoResult.value.ingredients ?? undefined,
      sourceType: "photo",
      imageUrl: photoResult.value.thumbnailUrl ?? undefined,
      nutrition: photoResult.value.nutrition ?? {},
      amazonUrl: photoResult.value.amazonUrl ?? undefined,
      notes: `Saved from photo. Sources: ${photoResult.value.sources.join(", ") || "unknown"}`,
    });
    photoStatus.value = "Saved to your products.";
  } catch (err) {
    photoStatus.value = err instanceof Error ? err.message : "Could not save";
  } finally {
    busy.value = false;
  }
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  photoFile.value = file;
  photoResult.value = null;
  if (!file) {
    thumbnail.value = "";
    return;
  }
  thumbnail.value = await fileToJpegDataUrl(file);
}
</script>

<template>
  <div class="stack">
    <p class="muted">Look up a packaged food by UPC, or photograph the label for OCR.</p>
    <div class="tabs">
      <button type="button" :class="{ active: tab === 'upc' }" @click="tab = 'upc'">UPC Lookup</button>
      <button type="button" :class="{ active: tab === 'photo' }" @click="tab = 'photo'">Photo / OCR</button>
    </div>

    <form v-if="tab === 'upc'" class="card form" @submit.prevent="onUpcLookup">
      <input v-model="upc" required placeholder="Enter UPC code" />
      <button type="submit" :disabled="busy">Lookup</button>
      <p v-if="upcError" class="error">{{ upcError }}</p>
      <div v-if="upcResult" class="result">
        <p><strong>{{ upcResult.name }}</strong></p>
        <p class="muted">{{ upcResult.brand || "No brand" }}</p>
        <pre>{{ JSON.stringify(upcResult.nutrition, null, 2) }}</pre>
        <button type="button" :disabled="busy" @click="saveUpc">Save Food</button>
        <p v-if="upcStatus" class="muted">{{ upcStatus }}</p>
      </div>
    </form>

    <form v-else class="card form" @submit.prevent="onPhoto">
      <input type="file" accept="image/jpeg,image/png,image/webp" @change="onFile" />
      <img v-if="thumbnail" :src="thumbnail" alt="Preview" class="thumb" />
      <textarea v-model="ocrText" rows="4" placeholder="Optional: paste OCR text"></textarea>
      <button type="submit" :disabled="busy">{{ busy ? "Processing..." : "Identify Product" }}</button>
      <p v-if="photoError" class="error">{{ photoError }}</p>
      <div v-if="photoResult" class="result">
        <p><strong>{{ photoResult.name || "Unknown" }}</strong></p>
        <p class="muted">UPC: {{ photoResult.upc || "Not found" }} · {{ photoResult.sources.join(", ") }}</p>
        <pre>{{ JSON.stringify(photoResult.nutrition, null, 2) }}</pre>
        <input v-model="photoName" placeholder="Food name for save" />
        <button type="button" :disabled="busy" @click="savePhoto">Save Food</button>
        <p v-if="photoStatus" class="muted">{{ photoStatus }}</p>
      </div>
    </form>
  </div>
</template>
