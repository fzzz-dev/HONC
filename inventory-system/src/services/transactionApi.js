const BASE = import.meta.env.VITE_API_URL || "/api";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Request failed");
      }

      return data.data !== undefined ? data.data : data;
    } catch (err) {
      lastError = err;

      const isNetworkError = err instanceof TypeError;

      if (!isNetworkError || attempt === 2) break;

      await delay(500 * (attempt + 1));
    }
  }

  if (lastError instanceof TypeError) {
    throw new Error(
      "Backend is not reachable yet. Please wait a moment and try again."
    );
  }

  throw lastError;
}

const j = (obj) => JSON.stringify(obj);

const qs = (params = {}) => {
  const s = new URLSearchParams(params).toString();
  return s ? `?${s}` : "";
};

//
// ENQUIRY API
//
export const enquiryApi = {
  getAll: (params = {}) =>
    request(`/enquiries${qs(params)}`),

  getOne: (id) =>
    request(`/enquiries/${id}`),

  getNextNumber: () =>
    request(`/enquiries/next-number`),

  create: (body) =>
    request(`/enquiries`, {
      method: "POST",
      body: j(body),
    }),

  update: (id, body) =>
    request(`/enquiries/${id}`, {
      method: "PUT",
      body: j(body),
    }),

  remove: (id) =>
    request(`/enquiries/${id}`, {
      method: "DELETE",
    }),
};

//
// QUOTATION API
//
export const quotationApi = {
  getAll: (params = {}) =>
    request(`/quotation${qs(params)}`),

  getOne: (id) =>
    request(`/quotation/${id}`),

  getNextNumber: () =>
    request(`/quotation/next-number`),

  create: (body) =>
    request(`/quotation`, {
      method: "POST",
      body: j(body),
    }),

  update: (id, body) =>
    request(`/quotation/${id}`, {
      method: "PUT",
      body: j(body),
    }),

  remove: (id) =>
    request(`/quotation/${id}`, {
      method: "DELETE",
    }),
};

//
// SALES ORDER API
//
export const salesOrderApi = {
  getAll: (params = {}) =>
    request(`/sales-orders${qs(params)}`),

  getOne: (id) =>
    request(`/sales-orders/${id}`),

  getNextNumber: () =>
    request(`/sales-orders/next-number`),

  create: (body) =>
    request(`/sales-orders`, {
      method: "POST",
      body: j(body),
    }),

  update: (id, body) =>
    request(`/sales-orders/${id}`, {
      method: "PUT",
      body: j(body),
    }),

  remove: (id) =>
    request(`/sales-orders/${id}`, {
      method: "DELETE",
    }),
};

//
// YARN INWARD API
//
export const yarnInwardApi = {
  getAll: (params = {}) =>
    request(`/yarn-inwards${qs(params)}`),

  getOne: (id) =>
    request(`/yarn-inwards/${id}`),

  getNextNumber: () =>
    request(`/yarn-inwards/next-number`),

  create: (body) =>
    request(`/yarn-inwards`, {
      method: "POST",
      body: j(body),
    }),

  update: (id, body) =>
    request(`/yarn-inwards/${id}`, {
      method: "PUT",
      body: j(body),
    }),

  remove: (id) =>
    request(`/yarn-inwards/${id}`, {
      method: "DELETE",
    }),
};

//
// COMBINED EXPORT
//
export const transactionApi = {
  enquiry: enquiryApi,
  quotation: quotationApi,
  salesOrder: salesOrderApi,
  yarnInward: yarnInwardApi,
};