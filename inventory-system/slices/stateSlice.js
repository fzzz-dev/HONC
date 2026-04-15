import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = "http://localhost:5000/api/states";

// GET
export const fetchStates = createAsyncThunk("states/fetch", async () => {
  const res = await axios.get(API);
  return res.data.data;
});

// CREATE
export const addState = createAsyncThunk("states/add", async (data) => {
  const res = await axios.post(API, data);
  return res.data.data;
});

// UPDATE
export const updateState = createAsyncThunk(
  "states/update",
  async ({ id, data }) => {
    const res = await axios.put(`${API}/${id}`, data);
    return res.data.data;
  }
);

// DELETE
export const deleteState = createAsyncThunk(
  "states/delete",
  async (id) => {
    await axios.delete(`${API}/${id}`);
    return id;
  }
);

const stateSlice = createSlice({
  name: "states",
  initialState: {
    data: [],
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStates.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(addState.fulfilled, (state, action) => {
        state.data.unshift(action.payload);
      })
      .addCase(updateState.fulfilled, (state, action) => {
        state.data = state.data.map((s) =>
          s._id === action.payload._id ? action.payload : s
        );
      })
      .addCase(deleteState.fulfilled, (state, action) => {
        state.data = state.data.filter((s) => s._id !== action.payload);
      });
  },
});

export default stateSlice.reducer;