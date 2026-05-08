import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const BASE_URL = (import.meta.env.VITE_API_URL || "/api") + "/processes";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchProcesses = createAsyncThunk(
  "processes/fetchAll",
  async ({ search = "", active, departmentId } = {}, { rejectWithValue }) => {
    try {
      const params = { search };
      if (active !== undefined) params.active = active;
      if (departmentId) params.departmentId = departmentId;
      const { data } = await axios.get(BASE_URL, { params });
      return data; // { success, data }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createProcess = createAsyncThunk(
  "processes/create",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axios.post(BASE_URL, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateProcess = createAsyncThunk(
  "processes/update",
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const { data } = await axios.put(`${BASE_URL}/${id}`, payload);
      return data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteProcess = createAsyncThunk(
  "processes/delete",
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

const processSlice = createSlice({
  name: "processes",
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
    // fetchProcesses
    builder
      .addCase(fetchProcesses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProcesses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
      })
      .addCase(fetchProcesses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createProcess
    builder
      .addCase(createProcess.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(createProcess.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createProcess.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // updateProcess
    builder
      .addCase(updateProcess.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(updateProcess.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updatedId = action.payload.id || action.payload._id;
        const idx = state.items.findIndex(
          (p) => (p.id || p._id) === updatedId,
        );
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(updateProcess.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });

    // deleteProcess
    builder
      .addCase(deleteProcess.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(deleteProcess.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.items = state.items.filter(
          (p) => (p.id || p._id) !== action.payload,
        );
      })
      .addCase(deleteProcess.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload;
      });
  },
});

export const { clearActionError } = processSlice.actions;
export default processSlice.reducer;
