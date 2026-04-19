import { configureStore } from "@reduxjs/toolkit";
import countryReducer from "./slices/countrySlice";
import stateReducer from "./slices/stateSlice";
import cityReducer from "./slices/citySlice";
import storeReducer from "./slices/Storeslice";
import departmentReducer from "./slices/Departmentslice";
import processReducer from "./slices/Processslice";

export const store = configureStore({
  reducer: {
    countries: countryReducer,
    states: stateReducer,
    cities: cityReducer,
    stores: storeReducer,
    departments: departmentReducer, // ✅ add
    processes: processReducer,
  },
});
