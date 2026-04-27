// src/services/inventoryApi.js
const BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const data = await res.json();
      // Handle both { success: true, data: ... } and direct array/object responses
      if (!res.ok) {
        throw new Error(data.message || data.error || "Request failed");
      }
      return data.data !== undefined ? data.data : data;
    } catch (error) {
      lastError = error;
      const isNetworkError = error instanceof TypeError;
      if (!isNetworkError || attempt === 2) break;
      await delay(500 * (attempt + 1));
    }
  }

  if (lastError instanceof TypeError) {
    throw new Error(
      "Backend is not reachable yet. Please wait a moment and try again.",
    );
  }
  throw lastError;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const j = (obj) => JSON.stringify(obj);
const qs = (params = {}) => {
  const s = new URLSearchParams(params).toString();
  return s ? `?${s}` : "";
};

// ── Masters ──────────────────────────────────────────────────────────────────

export const inventoryHeadApi = {
  getAll: (p = {}) => request(`/inventory-heads${qs(p)}`),
  create: (body) => request("/inventory-heads", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/inventory-heads/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/inventory-heads/${id}`, { method: "DELETE" }),
};

export const mainCategoryApi = {
  getAll: (p = {}) => request(`/inventory-heads/main-categories${qs(p)}`),
  create: (body) => request("/inventory-heads/main-categories", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/inventory-heads/main-categories/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/inventory-heads/main-categories/${id}`, { method: "DELETE" }),
};

export const uomApi = {
  getAll: (p = {}) => request(`/inventory-heads/uoms${qs(p)}`),
  create: (body) => request("/inventory-heads/uoms", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/inventory-heads/uoms/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/inventory-heads/uoms/${id}`, { method: "DELETE" }),
};

export const makeApi = {
  getAll: (p = {}) => request(`/makes${qs(p)}`),
  create: (body) => request("/makes", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/makes/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/makes/${id}`, { method: "DELETE" }),
};

export const specApi = {
  getAll: (p = {}) => request(`/specs${qs(p)}`),
  create: (body) => request("/specs", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/specs/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/specs/${id}`, { method: "DELETE" }),
};

export const itemApi = {
  getAll: (p = {}) => request(`/items${qs(p)}`),
  getOne: (id) => request(`/items/${id}`),
  create: (body) => request("/items", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/items/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/items/${id}`, { method: "DELETE" }),
};

export const supplierApi = {
  getAll: (p = {}) => request(`/suppliers${qs(p)}`),
  getOne: (id) => request(`/suppliers/${id}`),
  create: (body) => request("/suppliers", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/suppliers/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/suppliers/${id}`, { method: "DELETE" }),
};

export const departmentApi = {
  getAll: (p = {}) => request(`/departments${qs(p)}`),
};

export const storeApi = {
  getAll: (p = {}) => request(`/stores${qs(p)}`),
};

// ── Transactions ─────────────────────────────────────────────────────────────

export const purchaseIndentApi = {
  getAll: (p = {}) => request(`/purchase-indents${qs(p)}`),
  getOne: (id) => request(`/purchase-indents/${id}`),
  getNextNumber: () => request("/purchase-indents/next-number"),
  create: (body) => request("/purchase-indents", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/purchase-indents/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/purchase-indents/${id}`, { method: "DELETE" }),
};

export const purchaseOrderApi = {
  getAll: (p = {}) => request(`/purchase-orders${qs(p)}`),
  getOne: (id) => request(`/purchase-orders/${id}`),
  getNextNumber: () => request("/purchase-orders/next-number"),
  getIndents: () => request("/purchase-orders/indents"),
  getSuppliers: () => request("/purchase-orders/suppliers"),
  create: (body) => request("/purchase-orders", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/purchase-orders/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/purchase-orders/${id}`, { method: "DELETE" }),
};

export const grnApi = {
  getAll: (p = {}) => request(`/grns${qs(p)}`),
  getOne: (id) => request(`/grns/${id}`),
  getNextNumber: () => request("/grns/next-number"),
  create: (body) => request("/grns", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/grns/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/grns/${id}`, { method: "DELETE" }),
};

export const consumptionIssueApi = {
  getAll: (p = {}) => request(`/consumption-issues${qs(p)}`),
  create: (body) => request("/consumption-issues", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/consumption-issues/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/consumption-issues/${id}`, { method: "DELETE" }),
};
