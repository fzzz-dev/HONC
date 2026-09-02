import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { Provider } from "react-redux";
import { store } from "./store";
import { AuthProvider } from "./context/AuthContext";
import { UnsavedChangesProvider } from "./context/UnsavedChangesContext";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <UnsavedChangesProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UnsavedChangesProvider>
    </Provider>
  </React.StrictMode>,
);

