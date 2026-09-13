import { api } from "./api";

export type TrafficLight = "green" | "yellow" | "red";

export type Product = {
  id: string;
  name: string;
  upc: string | null;
  brand: string | null;
  ingredients: string;
  nutrition: Record<string, unknown>;
  sourceType: string;
  imageUrl: string | null;
  notes: string;
  listingUrl: string | null;
  storeIds?: string[];
  ratings?: Array<{
    dietProfileId: string;
    rating: TrafficLight | null;
    recommendation: TrafficLight | null;
    mark: TrafficLight | null;
  }>;
};

export type Store = { id: string; name: string; address: string };

export type DietProfile = {
  id: string;
  name: string;
  active: boolean;
  nutrients: string[];
};

export type ShoppingItem = {
  id: string;
  name: string;
  productId: string | null;
  checked: boolean;
};

export type HistoricList = {
  id: string;
  createdAt: number;
  archivedAt: number | null;
  items: ShoppingItem[];
};

export type UpcResult = {
  name: string;
  brand: string;
  imageUrl: string;
  ingredients: string;
  nutrition: Record<string, unknown>;
  upc: string;
  listingUrl: string | null;
};

export function listProducts() {
  return api<{ products: Product[] }>("/api/products");
}

export function createProduct(body: Record<string, unknown>) {
  return api<{ product: Product }>("/api/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getProduct(id: string) {
  return api<{
    product: Product;
    stores: Store[];
    unlinkedStores: Store[];
    ratings: Array<{
      dietProfileId: string;
      rating: TrafficLight | null;
      recommendation: TrafficLight | null;
      mark: TrafficLight | null;
      dietProfile: DietProfile | null;
    }>;
    dietProfiles: DietProfile[];
  }>(`/api/products/${id}`);
}

export function updateProduct(id: string, body: { listingUrl?: string | null }) {
  return api<{ product: Product }>(`/api/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function linkStore(productId: string, storeId: string) {
  return api<void>(`/api/products/${productId}/stores`, {
    method: "POST",
    body: JSON.stringify({ storeId }),
  });
}

export function setProductRating(
  productId: string,
  dietProfileId: string,
  rating: TrafficLight,
) {
  return api<{
    rating: TrafficLight;
    recommendation: TrafficLight | null;
    mark: TrafficLight | null;
  }>(
    `/api/products/${productId}/ratings`,
    {
      method: "POST",
      body: JSON.stringify({ dietProfileId, rating }),
    },
  );
}

export function lookupUpc(upc: string) {
  return api<{ result: UpcResult }>("/api/products/upc-lookup", {
    method: "POST",
    body: JSON.stringify({ upc }),
  });
}

export function listStores() {
  return api<{ stores: Store[] }>("/api/stores");
}

export function createStore(name: string, address: string) {
  return api<{ store: Store }>("/api/stores", {
    method: "POST",
    body: JSON.stringify({ name, address }),
  });
}

export function listDietProfiles() {
  return api<{ dietProfiles: DietProfile[] }>("/api/diet-profiles");
}

export function createDietProfile(name: string, nutrients: string[]) {
  return api<{ dietProfile: DietProfile }>("/api/diet-profiles", {
    method: "POST",
    body: JSON.stringify({ name, nutrients }),
  });
}

export function patchDietProfile(id: string, body: { name?: string; active?: boolean }) {
  return api<{ dietProfile: DietProfile }>(`/api/diet-profiles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function addDietProfileNutrient(id: string, nutrient: string) {
  return api<void>(`/api/diet-profiles/${id}/nutrients`, {
    method: "POST",
    body: JSON.stringify({ nutrient }),
  });
}

export function removeDietProfileNutrient(id: string, nutrient: string) {
  return api<void>(`/api/diet-profiles/${id}/nutrients/${encodeURIComponent(nutrient)}`, {
    method: "DELETE",
  });
}

export function getShopping() {
  return api<{ items: ShoppingItem[] }>("/api/shopping");
}

export function addShoppingItem(name: string, productId?: string) {
  return api<{ item: ShoppingItem }>("/api/shopping/items", {
    method: "POST",
    body: JSON.stringify({ name, productId }),
  });
}

export function toggleShoppingItem(id: string, checked: boolean) {
  return api<{ item: ShoppingItem }>(`/api/shopping/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ checked }),
  });
}

export function archiveShoppingList() {
  return api<{ list: { id: string } }>("/api/shopping/archive", {
    method: "POST",
  });
}

export function shoppingHistory() {
  return api<{ lists: HistoricList[] }>("/api/shopping/history");
}
