const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config(); // ← must be BEFORE anything that reads process.env

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Routes
app.use("/api/countries", require("./routes/countryRoutes"));
app.use("/api/states", require("./routes/stateRoutes"));
app.use("/api/cities", require("./routes/cityRoutes"));
app.use("/api/inventory-heads", require("./routes/InventoryRoutes"));
app.use("/api/stores", require("./routes/storeRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/processes", require("./routes/Processroutes"));
app.use("/api/makes", require("./routes/makeRoutes"));
app.use("/api/specs", require("./routes/specRoutes"));
app.use("/api/suppliers", require("./routes/supplierRoutes"));
app.use("/api/supplier-types", require("./routes/SuppliertypeRoutes"));
app.use("/api/items", require("./routes/itemRoutes"));
app.use("/api/purchase-indents", require("./routes/Purchaseindentroutes"));
app.use("/api/purchase-orders", require("./routes/purchaseOrderRoutes")); // ✅ FIX: was commented out
app.use("/api/item-price-lists", require("./routes/itemPriceListRoutes")); // ✅ FIX: was missing")
// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
