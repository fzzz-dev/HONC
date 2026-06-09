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
  downloadTemplate: async () => {
    const res = await fetch(`${BASE}/items/template`);
    if (!res.ok) throw new Error("Failed to download template");
    return res.blob();
  },
  bulkUpload: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/items/bulk-upload`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Bulk upload failed");
    }
    return data;
  },
};

export const supplierApi = {
  getAll: (p = {}) => request(`/suppliers${qs(p)}`),
  getOne: (id) => request(`/suppliers/${id}`),
  create: (body) => request("/suppliers", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/suppliers/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/suppliers/${id}`, { method: "DELETE" }),
  downloadTemplate: async () => {
    const res = await fetch(`${BASE}/suppliers/template`);
    if (!res.ok) throw new Error("Failed to download template");
    return res.blob();
  },
  bulkUpload: async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${BASE}/suppliers/bulk`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Bulk upload failed");
    }
    return data;
  },
};

export const paymentTermsApi = {
  getAll: () => request("/payment-terms"),
  getOne: (id) => request(`/payment-terms/${id}`),
  create: (body) => request("/payment-terms", { method: "POST", body: j(body) }),
  update: (id, b) =>
    request(`/payment-terms/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/payment-terms/${id}`, { method: "DELETE" }),
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
  getIndents: () => request("/purchase-indents"),
  getSuppliers: () => request("/purchase-orders/suppliers"),
  create: (body) => request("/purchase-orders", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/purchase-orders/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/purchase-orders/${id}`, { method: "DELETE" }),
  
  // Existing approval methods
  getLevel1Pending: () => request("/reports/po-level1-pending"),
  getLevel2Pending: () => request("/reports/po-level2-pending"),
  approveLevel1: (id, approvedBy) => request(`/reports/approve-level1/${id}`, { method: "PUT", body: JSON.stringify({ approvedBy }) }),
  approveLevel2: (id, approvedBy) => request(`/reports/approve-level2/${id}`, { method: "PUT", body: JSON.stringify({ approvedBy }) }),
  bulkApproveLevel1: (poIds, approvedBy) => request("/reports/bulk-approve-level1", { method: "POST", body: JSON.stringify({ poIds, approvedBy }) }),
  bulkApproveLevel2: (poIds, approvedBy) => request("/reports/bulk-approve-level2", { method: "POST", body: JSON.stringify({ poIds, approvedBy }) }),
  
  // NEW SIMPLE METHODS - Add these
  getLevel2PendingSimple: () => request("/level/level2-pending"),
  getLevel1PendingSimple: () => request("/level/level1-pending"),
  getPOItems: (poId) => request(`/level/po-items/${poId}`),
  approveLevel2Simple: (id, approvedBy) => request(`/level/approve-level2/${id}`, { method: "PUT", body: JSON.stringify({ approvedBy }) }),
  approveLevel1Simple: (id, approvedBy) => request(`/level/approve-level1/${id}`, { method: "PUT", body: JSON.stringify({ approvedBy }) }),
  bulkApproveLevel2Simple: (poIds, approvedBy) => request("/level/bulk-approve-level2", { method: "POST", body: JSON.stringify({ poIds, approvedBy }) }),
  bulkApproveLevel1Simple: (poIds, approvedBy) => request("/level/bulk-approve-level1", { method: "POST", body: JSON.stringify({ poIds, approvedBy }) }),

  // Add this to purchaseOrderApi
getIndentsForPicking: async () => {
  // Try to get with both statuses, or just get all and filter in frontend
  try {
    const [openIndents, partialIndents] = await Promise.all([
      api.get('/purchase-indents?status=Open'),
      api.get('/purchase-indents?status=Partial')
    ]);
    
    const allIndents = [...(openIndents.data?.data || []), ...(partialIndents.data?.data || [])];
    return { success: true, data: allIndents };
  } catch (err) {
    console.error("Error fetching indents for picking:", err);
    return { success: false, data: [] };
  }
},

updateIndentBalance: (indentDetailId, poQty) => 
  request(`/purchase-indents/update-balance/${indentDetailId}`, { 
    method: "PUT", 
    body: JSON.stringify({ poQty }) 
  }),
};

export const grnApi = {
  getAll: (p = {}) => request(`/grns${qs(p)}`),
  getOne: (id) => request(`/grns/${id}`),
  getNextNumber: () => request("/grns/next-number"),
  getPendingPOItems: (supplierId) => {
    const params = supplierId ? { supplierId } : {};
    return request(`/grns/pending-po-items${qs(params)}`);
  },

  create: (body) => request("/grns", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/grns/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/grns/${id}`, { method: "DELETE" }),
};

export const consumptionIssueApi = {
  getAll: (p = {}) => request(`/consumption-issues${qs(p)}`),
  getNextNumber: () => request("/consumption-issues/next-no"),
  create: (body) => request("/consumption-issues", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/consumption-issues/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/consumption-issues/${id}`, { method: "DELETE" }),
};

export const openingStockApi = {
  getAll: (p = {}) => request(`/opening-stocks${qs(p)}`),
  getNextNumber: () => request("/opening-stocks/next-number"),
  create: (body) => request("/opening-stocks", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/opening-stocks/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/opening-stocks/${id}`, { method: "DELETE" }),
};

