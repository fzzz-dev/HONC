// src/services/productionApi.js
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

// ── Production Masters ──────────────────────────────────────────────────────

export const colorApi = {
  getAll: (p = {}) => request(`/production-masters/colors${qs(p)}`),
  getOne: (id) => request(`/production-masters/colors/${id}`),
  getActive: () => request("/production-masters/colors/active"),
  create: (body) => request("/production-masters/colors", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/production-masters/colors/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/production-masters/colors/${id}`, { method: "DELETE" }),
  hardDelete: (id) => request(`/production-masters/colors/${id}/permanent`, { method: "DELETE" }),
  exportToCSV: (params = {}) => {
    const queryString = qs(params);
    window.open(`${BASE}/production-masters/colors/export/csv${queryString}`, '_blank');
  },
};

export const countsApi = {
  getAll: (p = {}) => request(`/production-masters/counts${qs(p)}`),
  getOne: (id) => request(`/production-masters/counts/${id}`),
  getActive: () => request("/production-masters/counts/active"),
  create: (body) => request("/production-masters/counts", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/production-masters/counts/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/production-masters/counts/${id}`, { method: "DELETE" }),
  hardDelete: (id) => request(`/production-masters/counts/${id}/permanent`, { method: "DELETE" }),
  exportToCSV: (params = {}) => {
    const queryString = qs(params);
    window.open(`${BASE}/production-masters/counts/export/csv${queryString}`, '_blank');
  },
};

export const yarnTypeApi = {
  getAll: (p = {}) => request(`/production-masters/yarn-types${qs(p)}`),
  getOne: (id) => request(`/production-masters/yarn-types/${id}`),
  getActive: () => request("/production-masters/yarn-types/active"),
  create: (body) => request("/production-masters/yarn-types", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/production-masters/yarn-types/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/production-masters/yarn-types/${id}`, { method: "DELETE" }),
  hardDelete: (id) => request(`/production-masters/yarn-types/${id}/permanent`, { method: "DELETE" }),
  exportToCSV: (params = {}) => {
    const queryString = qs(params);
    window.open(`${BASE}/production-masters/yarn-types/export/csv${queryString}`, '_blank');
  },
};

export const millApi = {
  getAll: (p = {}) => request(`/production-masters/mills${qs(p)}`),
  getOne: (id) => request(`/production-masters/mills/${id}`),
  getActive: () => request("/production-masters/mills/active"),
  create: (body) => request("/production-masters/mills", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/production-masters/mills/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/production-masters/mills/${id}`, { method: "DELETE" }),
  hardDelete: (id) => request(`/production-masters/mills/${id}/permanent`, { method: "DELETE" }),
  exportToCSV: (params = {}) => {
    const queryString = qs(params);
    window.open(`${BASE}/production-masters/mills/export/csv${queryString}`, '_blank');
  },
};

export const productionProcessApi = {
  getAll: (p = {}) => request(`/production-masters/processes${qs(p)}`),
  getOne: (id) => request(`/production-masters/processes/${id}`),
  getActive: () => request("/production-masters/processes/active"),
  create: (body) => request("/production-masters/processes", { method: "POST", body: j(body) }),
  update: (id, b) => request(`/production-masters/processes/${id}`, { method: "PUT", body: j(b) }),
  remove: (id) => request(`/production-masters/processes/${id}`, { method: "DELETE" }),
  hardDelete: (id) => request(`/production-masters/processes/${id}/permanent`, { method: "DELETE" }),
  exportToCSV: (params = {}) => {
    const queryString = qs(params);
    window.open(`${BASE}/production-masters/processes/export/csv${queryString}`, '_blank');
  },
};


// ── Combined export for easier imports ──────────────────────────────────────

export const productionApi = {
  color: colorApi,
  counts: countsApi,
  yarnType: yarnTypeApi,
  mill: millApi,
  process: productionProcessApi,
};