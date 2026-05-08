// slices/stateSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ✅ FIX: relative path — same fix as countrySlice
const BASE_URL = (import.meta.env.VITE_API_URL || "/api") + "/states";

export const fetchStates = createAsyncThunk(
  "states/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const res = await axios.get(BASE_URL);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const addState = createAsyncThunk(
  "states/add",
  async (data, { rejectWithValue }) => {
    try {
      const res = await axios.post(BASE_URL, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const updateState = createAsyncThunk(
  "states/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await axios.put(`${BASE_URL}/${id}`, data);
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

export const deleteState = createAsyncThunk(
  "states/delete",
  async (id, { rejectWithValue }) => {
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

const stateSlice = createSlice({
  name: "states",
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    // fetch
    builder
      .addCase(fetchStates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStates.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchStates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // add
    builder.addCase(addState.fulfilled, (state, action) => {
      state.data.unshift(action.payload);
    });

    // update
    builder.addCase(updateState.fulfilled, (state, action) => {
      state.data = state.data.map((s) =>
        (s.id || s._id) === (action.payload.id || action.payload._id) ? action.payload : s,
      );
    });

    // delete
    builder.addCase(deleteState.fulfilled, (state, action) => {
      state.data = state.data.filter((s) => (s.id || s._id) !== action.payload);
    });
  },
});

export default stateSlice.reducer;
