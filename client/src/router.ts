import { createRouter, createWebHistory } from "vue-router";
import Home from "./pages/Home.vue";
import Register from "./pages/Register.vue";
import Login from "./pages/Login.vue";
import Account from "./pages/Account.vue";
import Products from "./pages/Products.vue";
import ProductDetail from "./pages/ProductDetail.vue";
import Capture from "./pages/Capture.vue";
import Stores from "./pages/Stores.vue";
import ShoppingList from "./pages/ShoppingList.vue";
import ShoppingHistory from "./pages/ShoppingHistory.vue";
import DietProfiles from "./pages/DietProfiles.vue";
import { getMe } from "./api";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/register", component: Register, meta: { public: true, title: "Register" } },
    { path: "/login", component: Login, meta: { public: true, title: "Log in" } },
    { path: "/", component: Home, meta: { requiresAuth: true, title: "Home", hideBack: true } },
    { path: "/account", component: Account, meta: { requiresAuth: true, title: "Account" } },
    { path: "/products", component: Products, meta: { requiresAuth: true, title: "My Saved Products" } },
    {
      path: "/products/:id",
      component: ProductDetail,
      meta: { requiresAuth: true, title: "Product Details" },
    },
    { path: "/capture", component: Capture, meta: { requiresAuth: true, title: "Lookup Product" } },
    { path: "/stores", component: Stores, meta: { requiresAuth: true, title: "My Stores" } },
    {
      path: "/shopping",
      component: ShoppingList,
      meta: { requiresAuth: true, title: "Shopping List" },
    },
    {
      path: "/shopping/history",
      component: ShoppingHistory,
      meta: { requiresAuth: true, title: "Past Lists" },
    },
    {
      path: "/diet-profiles",
      component: DietProfiles,
      meta: { requiresAuth: true, title: "Diet Profiles" },
    },
    { path: "/diets", redirect: "/diet-profiles" },
  ],
});

router.beforeEach(async (to) => {
  if (to.meta.public) {
    return true;
  }
  try {
    await getMe();
    return true;
  } catch {
    return { path: "/login" };
  }
});

export default router;
