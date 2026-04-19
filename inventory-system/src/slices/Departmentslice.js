import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = "/api/departments";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchDepartments = createAsyncThunk(
  "departments/fetchAll",
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

export const createDepartment = createAsyncThunk(
  "departments/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(BASE_URL, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateDepartment = createAsyncThunk(
  "departments/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(`${BASE_URL}/${id}`, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteDepartment = createAsyncThunk(
  "departments/delete",
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

const departmentSlice = createSlice({
  name: "departments",
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
    // fetchDepartments
    builder
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createDepartment
    builder
      .addCase(createDepartment.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createDepartment.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createDepartment.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // updateDepartment
    builder
      .addCase(updateDepartment.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateDepartment.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.items.findIndex((d) => d._id === action.payload._id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateDepartment.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // deleteDepartment
    builder
      .addCase(deleteDepartment.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteDepartment.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items = state.items.filter((d) => d._id !== action.payload);
      })
      .addCase(deleteDepartment.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });
  },
});

export const { clearActionError } = departmentSlice.actions;
export default departmentSlice.reducer;