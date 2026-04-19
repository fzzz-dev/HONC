import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API = "http://localhost:5000/api/countries";

// GET
export const fetchCountries = createAsyncThunk("countries/fetch", async () => {
  const res = await axios.get(API);
  return res.data.data;
});

// CREATE
export const addCountry = createAsyncThunk("countries/add", async (data) => {
  const res = await axios.post(API, data);
  return res.data.data;
});

// UPDATE
export const updateCountry = createAsyncThunk(
  "countries/update",
  async ({ id, data }) => {
    const res = await axios.put(`${API}/${id}`, data);
    return res.data.data;
  },
);

// DELETE
export const deleteCountry = createAsyncThunk(
  "countries/delete",
  async (id) => {
    await axios.delete(`${API}/${id}`);
    return id;
  },
);

const slice = createSlice({
  name: "countries",
  initialState: {
    data: [],
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.data = action.payload;
      })
      .addCase(addCountry.fulfilled, (state, action) => {
        state.data.unshift(action.payload);
      })
      .addCase(updateCountry.fulfilled, (state, action) => {
        state.data = state.data.map((c) =>
          c._id === action.payload._id ? action.payload : c,
        );
      })
      .addCase(deleteCountry.fulfilled, (state, action) => {
        state.data = state.data.filter((c) => c._id !== action.payload);
      });
  },
});

export default slice.reducer;
