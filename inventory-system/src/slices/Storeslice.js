import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL || "/api") + "/stores";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchStores = createAsyncThunk(
  "stores/fetchAll",
  async ({ search = "", active } = {}, { rejectWithValue }) => {
    try {
      const params = { search };
      if (active !== undefined) params.active = active;
      const { data } = await axios.get(BASE_URL, { params });
      return data; // { success, data }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createStore = createAsyncThunk(
  "stores/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(BASE_URL, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateStore = createAsyncThunk(
  "stores/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(`${BASE_URL}/${id}`, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteStore = createAsyncThunk(
  "stores/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const storeSlice = createSlice({
  name: "stores",
  initialState: {
    items: [],
    loading: false,
    error: null,
    actionLoading: false,
    actionError: null,
  },
  reducers: {
    clearActionError: (state) => {
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    // fetchStores
    builder
      .addCase(fetchStores.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStores.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
      })
      .addCase(fetchStores.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createStore
    builder
      .addCase(createStore.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createStore.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createStore.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // updateStore
    builder
      .addCase(updateStore.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateStore.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((s) => s._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateStore.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // deleteStore
    builder
      .addCase(deleteStore.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteStore.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items = state.items.filter((s) => s._id !== action.payload);
      })
      .addCase(deleteStore.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });
  },
});

export const { clearActionError } = storeSlice.actions;
export default storeSlice.reducer;