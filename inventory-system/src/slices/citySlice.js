import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL || "/api") + "/cities";

// ─── Async Thunks ───────────────────────────────────────────────────────────

export const fetchCities = createAsyncThunk(
  "cities/fetchAll",
  async ({ search = "", page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await axios.get(BASE_URL, {
        params: { search, page, limit },
      });
      return data; // { success, data, total }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createCity = createAsyncThunk(
  "cities/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(BASE_URL, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateCity = createAsyncThunk(
  "cities/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(`${BASE_URL}/${id}`, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteCity = createAsyncThunk(
  "cities/delete",
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

const citySlice = createSlice({
  name: "cities",
  initialState: {
    items: [],
    total: 0,
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
    // fetchCities
    builder
      .addCase(fetchCities.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.total = action.payload.total;
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createCity
    builder
      .addCase(createCity.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createCity.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createCity.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // updateCity
    builder
      .addCase(updateCity.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateCity.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((c) => (c.id || c._id) === (action.payload.id || action.payload._id));
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateCity.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // deleteCity
    builder
      .addCase(deleteCity.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteCity.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items = state.items.filter((c) => (c.id || c._id) !== action.payload);
        state.total -= 1;
      })
      .addCase(deleteCity.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });
  },
});

export const { clearActionError } = citySlice.actions;
export default citySlice.reducer;