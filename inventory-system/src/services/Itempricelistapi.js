// API base URL - adjust this to your backend URL
const API_BASE_URL = "/api";

/**
 * Item Price List API Service
 */
class ItemPriceListAPI {
  /**
   * Helper method to handle API requests
   */
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "API request failed");
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  /**
   * CREATE - Create new price list
   */
  static async create(data) {
    return this.request("/item-price-lists", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * GET ALL - Fetch all price lists with optional filters
   */
  static async getAll(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/item-price-lists${queryString ? `?${queryString}` : ""}`;
    const res = await this.request(endpoint, { method: "GET" });
    return res.data || res || [];
  }

  /**
   * GET BY ID - Fetch single price list
   */
  static async getById(id) {
    return this.request(`/item-price-lists/${id}`, {
      method: "GET",
    });
  }

  /**
   * UPDATE - Update existing price list
   */
  static async update(id, data) {
    return this.request(`/item-price-lists/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE - Soft delete price list
   */
  static async delete(id) {
    return this.request(`/item-price-lists/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * SEARCH - Advanced search
   */
  static async search(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/item-price-lists/search?${queryString}`, {
      method: "GET",
    });
  }

  /**
   * GET EXPIRED - Fetch expired price lists
   */
  static async getExpired() {
    return this.request("/item-price-lists/expired", {
      method: "GET",
    });
  }

  /**
   * GET BY SUPPLIER - Fetch price lists for specific supplier
   */
  static async getBySupplier(supplierId) {
    return this.request(`/item-price-lists/supplier/${supplierId}`, {
      method: "GET",
    });
  }

  /**
   * GET ITEM PRICES - Compare prices across suppliers for an item
   */
  static async getItemPrices(itemId) {
    return this.request(`/item-price-lists/item/${itemId}`, {
      method: "GET",
    });
  }

  /**
   * BULK UPDATE STATUS
   */
  static async bulkUpdateStatus(data) {
    return this.request("/item-price-lists/bulk/status", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * EXPORT - Export price list
   */
  static async export(id, format = "json") {
    return this.request(`/item-price-lists/export/${id}?format=${format}`, {
      method: "GET",
    });
  }
}

export default ItemPriceListAPI;
