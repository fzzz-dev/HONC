// slices/countrySlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ✅ FIX: Use relative path so Vite proxy handles it in dev
//         and the deployed origin handles it in prod.
//         NEVER hardcode http://localhost:5000 — breaks in any other environment.
const BASE_URL = "/api/countries";

export const fetchCountries = createAsyncThunk(
  "countries/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(BASE_URL);
      return res.data.data; // unwrap { success, data }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const addCountry = createAsyncThunk(
  "countries/add",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(BASE_URL, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const updateCountry = createAsyncThunk(
  "countries/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}/${id}`, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const deleteCountry = createAsyncThunk(
  "countries/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

const slice = createSlice({
  name: "countries",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // fetch
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // add
    builder.addCase(addCountry.fulfilled, (state, action) => {
      state.data.unshift(action.payload);
    });

    // update
    builder.addCase(updateCountry.fulfilled, (state, action) => {
      state.data = state.data.map((c) =>
        (c.id || c._id) === (action.payload.id || action.payload._id) ? action.payload : c
      );
    });

    // delete
    builder.addCase(deleteCountry.fulfilled, (state, action) => {
      state.data = state.data.filter((c) => (c.id || c._id) !== action.payload);
    });
  },
});

export default slice.reducer;
