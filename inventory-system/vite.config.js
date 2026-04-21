// vite.config.js
// ✅ Add this proxy so that relative /api/* calls from the frontend
//    are forwarded to the Express server during development.
//    This is what makes "/api/countries" work instead of needing
//    "http://localhost:5000/api/countries" hardcoded everywhere.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        // No rewrite needed — your Express routes are already mounted at /api/*
      },
    },
  },
});
