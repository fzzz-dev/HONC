// src/services/inventoryApi.js
// Base URL — set REACT_APP_API_URL in your .env (e.g. http://localhost:5000/api)
const BASE ="http://localhost:5000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "Request failed");
  }
  return data.data;
}

// ── Inventory Heads ──────────────────────────────────────────────
export const inventoryHeadApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory-heads${qs ? "?" + qs : ""}`);
  },
  create: (body) =>
    request("/inventory-heads", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/inventory-heads/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) =>
    request(`/inventory-heads/${id}`, { method: "DELETE" }),
};

// ── Main Categories ──────────────────────────────────────────────
export const mainCategoryApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory-heads/main-categories${qs ? "?" + qs : ""}`);
  },
  create: (body) =>
    request("/inventory-heads/main-categories", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/inventory-heads/main-categories/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) =>
    request(`/inventory-heads/main-categories/${id}`, { method: "DELETE" }),
};

// ── UOM ──────────────────────────────────────────────────────────
export const uomApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/inventory-heads/uoms${qs ? "?" + qs : ""}`);
  },
  create: (body) =>
    request("/inventory-heads/uoms", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/inventory-heads/uoms/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) =>
    request(`/inventory-heads/uoms/${id}`, { method: "DELETE" }),
};