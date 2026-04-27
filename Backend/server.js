const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const sequelize = require("./config/database");
const models = require("./model"); // Initialize associations

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create database if not exists
async function ensureDatabaseExists() {
  const mysql = require("mysql2/promise");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || "inventory_db"}\`;`,
  );
  await connection.end();
}

const seedData = async () => {
  const { User, Role } = require("./model");
  
  // Seed Roles
  const roles = ["admin", "user", "manager"];
  for (const roleName of roles) {
    const exists = await Role.findOne({ where: { name: roleName } });
    if (!exists) {
      await Role.create({ name: roleName });
    }
  }

  const adminExists = await User.findOne({ where: { username: "admin" } });
  if (!adminExists) {
    await User.create({
      username: "admin",
      password: "admin",
      role: "admin",
      name: "System Administrator",
    });
    console.log("Default admin user created");
  }
};

// SQL Connection and Sync
ensureDatabaseExists()
  .then(() => sequelize.authenticate())
  .then(async () => {
    console.log("SQL Database Connected");
    return sequelize.sync();
  })
  .then(async () => {
    console.log("Database Synced");
    await seedData();
  })
  .catch((err) => {
    console.error("Database Connection/Sync Error:", err);
  });

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
app.use("/api/purchase-orders", require("./routes/purchaseOrderRoutes"));
app.use("/api/item-price-lists", require("./routes/itemPriceListRoutes"));
app.use("/api/grns", require("./routes/Grnroutes"));
app.use("/api/consumption-issues", require("./routes/consumptionIssueRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/roles", require("./routes/roleRoutes"));
app.use("/api/permissions", require("./routes/permissionRoutes"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running (SQL Mode)" });
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
  console.log(`Server running on port ${PORT}`);
});
