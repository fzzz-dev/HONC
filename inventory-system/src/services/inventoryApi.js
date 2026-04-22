// src/services/inventoryApi.js
const BASE = import.meta.env.VITE_API_URL || "/api";
const API_BASE = BASE;

async function request(path, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Request failed");
      }
      return data.data;
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

// ── Inventory Heads ──────────────────────────────────────────────────────────
export const inventoryHeadApi = {
  getAll: (p = {}) => request(`/inventory-heads${qs(p)}`),
  create: (body) =>
    request("/inventory-heads", { method: "POST", body: j(body) }),
  update: (id, b) =>
    request(`/inventory-heads/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/inventory-heads/${id}`, { method: "DELETE" }),
};

// ── Main Categories ──────────────────────────────────────────────────────────
export const mainCategoryApi = {
  getAll: (p = {}) => request(`/inventory-heads/main-categories${qs(p)}`),
  create: (body) =>
    request("/inventory-heads/main-categories", {
      method: "POST",
      body: j(body),
    }),
  update: (id, b) =>
    request(`/inventory-heads/main-categories/${id}`, {
      method: "PUT",
      body: j(b),
    }),
  remove: (id) =>
    request(`/inventory-heads/main-categories/${id}`, { method: "DELETE" }),
};

// ── UOM ──────────────────────────────────────────────────────────────────────
export const uomApi = {
  getAll: (p = {}) => request(`/inventory-heads/uoms${qs(p)}`),
  create: (body) =>
    request("/inventory-heads/uoms", { method: "POST", body: j(body) }),
  update: (id, b) =>
    request(`/inventory-heads/uoms/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/inventory-heads/uoms/${id}`, { method: "DELETE" }),
};

// ── Makes ────────────────────────────────────────────────────────────────────
export const makeApi = {
  getAll: (p = {}) => request(`/makes${qs(p)}`),
  create: (body) => request("/makes", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/makes/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/makes/${id}`, { method: "DELETE" }),
};

// ── Specs ────────────────────────────────────────────────────────────────────
export const specApi = {
  getAll: (p = {}) => request(`/specs${qs(p)}`),
  create: (body) => request("/specs", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/specs/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/specs/${id}`, { method: "DELETE" }),
};

// ── Items ────────────────────────────────────────────────────────────────────
export const itemApi = {
  getAll: (p = {}) => request(`/items${qs(p)}`),
  getOne: (id) => request(`/items/${id}`),
  create: (body) => request("/items", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/items/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/items/${id}`, { method: "DELETE" }),
};

// ── Departments ──────────────────────────────────────────────────────────────
export const departmentApi = {
  getAll: (p = {}) => request(`/departments${qs(p)}`),
};

export const storeApi = {
  getAll: (p = {}) => request(`/stores${qs(p)}`),
};

export const grnApi = {
  getAll: (p = {}) => request(`/grns${qs(p)}`),
  create: (body) => request("/grns", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/grns/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/grns/${id}`, { method: "DELETE" }),
};

// ── Suppliers ────────────────────────────────────────────────────────────────
export const supplierApi = {
  getAll: (p = {}) => request(`/suppliers${qs(p)}`),
  getOne: (id) => request(`/suppliers/${id}`),
  create: (body) => request("/suppliers", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/suppliers/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/suppliers/${id}`, { method: "DELETE" }),
};

// ── Purchase Indents ─────────────────────────────────────────────────────────
export const purchaseIndentApi = {
  getAll: (p = {}) => request(`/purchase-indents${qs(p)}`),
  getOne: (id) => request(`/purchase-indents/${id}`),
  getNextNumber: () => request("/purchase-indents/next-number"),
  create: (body) =>
    request("/purchase-indents", { method: "POST", body: j(body) }),
  update: (id, b) =>
    request(`/purchase-indents/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/purchase-indents/${id}`, { method: "DELETE" }),
};

// ── Tiny helpers ─────────────────────────────────────────────────────────────
function qs(params = {}) {
  const s = new URLSearchParams(params).toString();
  return s ? `?${s}` : "";
}
function j(body) {
  return JSON.stringify(body);
}
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export const purchaseOrderApi = {
  // Get next PO number
  getNextNumber: async () => {
    const res = await fetch(`${API_BASE}/purchase-orders/next-number`);
    if (!res.ok) throw new Error("Failed to get next PO number");
    return res.json();
  },

  // Get all open indents for PO form
  getIndents: async () => {
    const res = await fetch(`${API_BASE}/purchase-orders/indents`);
    if (!res.ok) throw new Error("Failed to load indents");
    return res.json();
  },

  // Get all suppliers for PO form
  getSuppliers: async () => {
    const res = await fetch(`${API_BASE}/purchase-orders/suppliers`);
    if (!res.ok) throw new Error("Failed to load suppliers");
    return res.json();
  },

  // Get all purchase orders
  getAll: async () => {
    const res = await fetch(`${API_BASE}/purchase-orders`);
    if (!res.ok) throw new Error("Failed to load purchase orders");
    return res.json();
  },

  // Get single purchase order
  getOne: async (id) => {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`);
    if (!res.ok) throw new Error("Failed to load purchase order");
    return res.json();
  },

  // Create new purchase order
  create: async (data) => {
    const res = await fetch(`${API_BASE}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to create purchase order");
    }
    return res.json();
  },

  // Update purchase order
  update: async (id, data) => {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to update purchase order");
    }
    return res.json();
  },

  // Delete purchase order
  remove: async (id) => {
    const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to delete purchase order");
    }
    return res.json();
  },
};

export const consumptionIssueApi = {
  getAll: (p = {}) => request(`/consumption-issues${qs(p)}`),
  create: (body) =>
    request("/consumption-issues", { method: "POST", body: j(body) }),
  update: (id, b) =>
    request(`/consumption-issues/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/consumption-issues/${id}`, { method: "DELETE" }),
};
