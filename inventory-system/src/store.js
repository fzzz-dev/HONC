import { configureStore } from "@reduxjs/toolkit";
import countryReducer from "./slices/countrySlice";
import stateReducer from "./slices/stateSlice";
import cityReducer from "./slices/citySlice";
export const store = configureStore({
  reducer: {
    countries: countryReducer,
    states: stateReducer,
    cities: cityReducer,
  },
});
