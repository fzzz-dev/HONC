const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));
// Routes
app.use("/api/countries", require("./routes/countryRoutes"));
app.use("/api/states", require("./routes/stateRoutes"));
app.use("/api/cities", require("./routes/cityRoutes"));
// app.use('/api/inventory-heads', require('./routes/inventoryHead.routes'));
// app.use('/api/main-categories', require('./routes/mainCategory.routes'));
// app.use('/api/items', require('./routes/item.routes'));
// app.use('/api/suppliers', require('./routes/supplier.routes'));
// app.use('/api/stores', require('./routes/store.routes'));
// app.use('/api/departments', require('./routes/department.routes'));
// app.use('/api/processes', require('./routes/process.routes'));
// app.use('/api/purchase-indents', require('./routes/purchaseIndent.routes'));
// app.use('/api/purchase-orders', require('./routes/purchaseOrder.routes'));
// app.use('/api/purchase-grns', require('./routes/purchaseGRN.routes'));
// app.use('/api/consumption-issues', require('./routes/consumptionIssue.routes'));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Error handling middleware
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
