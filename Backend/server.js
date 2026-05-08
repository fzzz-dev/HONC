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

const ensureItemMovementTypeColumn = async () => {
  const dbName = process.env.DB_NAME || "inventory_db";
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = :dbName
       AND TABLE_NAME = 'Items'
       AND COLUMN_NAME = 'movementType'
     LIMIT 1`,
    { replacements: { dbName } },
  );

  if (!rows.length) {
    await sequelize.query(
      "ALTER TABLE `Items` ADD COLUMN `movementType` ENUM('moving','non-moving') NOT NULL DEFAULT 'moving' AFTER `spec`",
    );
    console.log("Added movementType column to Items table");
  }
};

async function columnExists(tableName, columnName) {
  const dbName = sequelize.config.database;
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = :db 
     AND LOWER(TABLE_NAME) = LOWER(:tbl) 
     AND LOWER(COLUMN_NAME) = LOWER(:col) LIMIT 1`,
    { replacements: { db: dbName, tbl: tableName, col: columnName } },
  );
  return rows.length > 0;
}

async function ensureSchemaEnhancements() {
  try {
    const [tables] = await sequelize.query("SHOW TABLES");
    const dbTables = tables.map(t => Object.values(t)[0].toLowerCase());
    console.log("Database tables found:", dbTables.join(", "));

    const patches = [
      ["items", "minimumStock", "ADD COLUMN `minimumStock` DECIMAL(12,2) NOT NULL DEFAULT 0"],
      ["items", "minimumOrderQty", "ADD COLUMN `minimumOrderQty` DECIMAL(12,2) NOT NULL DEFAULT 0"],
      ["items", "leadDays", "ADD COLUMN `leadDays` INT NOT NULL DEFAULT 0"],
      ["items", "inTransitDays", "ADD COLUMN `inTransitDays` INT NOT NULL DEFAULT 0"],
      ["items", "hsnCode", "ADD COLUMN `hsnCode` VARCHAR(255) NOT NULL DEFAULT ''"],
      ["items", "gstPercent", "ADD COLUMN `gstPercent` DECIMAL(5,2) NOT NULL DEFAULT 0"],
      ["items", "rackBinNo", "ADD COLUMN `rackBinNo` VARCHAR(255) NOT NULL DEFAULT ''"],
      ["items", "gstType", "ADD COLUMN `gstType` ENUM('local','other') NOT NULL DEFAULT 'local'"],
      ["suppliers", "shortCode", "ADD COLUMN `shortCode` VARCHAR(5) NULL DEFAULT ''"],
      ["suppliers", "paymentTermsId", "ADD COLUMN `paymentTermsId` INT NULL"],
      ["suppliers", "purchaseCategoryIds", "ADD COLUMN `purchaseCategoryIds` JSON NULL"],
      ["suppliers", "gstType", "ADD COLUMN `gstType` ENUM('local','other') NOT NULL DEFAULT 'local'"],
      ["purchaseorders", "paymentTermsId", "ADD COLUMN `paymentTermsId` INT NULL"],
      ["purchaseorders", "paymentTermsName", "ADD COLUMN `paymentTermsName` VARCHAR(255) NOT NULL DEFAULT ''"],
      ["purchaseorders", "gstType", "ADD COLUMN `gstType` VARCHAR(20) NOT NULL DEFAULT 'local'"],
      ["purchaseorders", "gstEnabled", "ADD COLUMN `gstEnabled` TINYINT(1) NOT NULL DEFAULT 1"],
      ["purchaseorders", "refNo", "ADD COLUMN `refNo` VARCHAR(255) NOT NULL DEFAULT ''"],
      ["purchaseorders", "refDate", "ADD COLUMN `refDate` DATE NULL"],
      ["purchaseorders", "deliveryDate", "ADD COLUMN `deliveryDate` DATE NULL"],
      ["purchaseorders", "purchaseIndentId", "ADD COLUMN `purchaseIndentId` INT NULL"],
      ["purchaseorders", "purchaseIndentNo", "ADD COLUMN `purchaseIndentNo` VARCHAR(255) NOT NULL DEFAULT ''"],
      ["purchaseorders", "grossAmount", "ADD COLUMN `grossAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "discAmount", "ADD COLUMN `discAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "poAmount", "ADD COLUMN `poAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "igstAmount", "ADD COLUMN `igstAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "cgstAmount", "ADD COLUMN `cgstAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "sgstAmount", "ADD COLUMN `sgstAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "netAmount", "ADD COLUMN `netAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "totalItems", "ADD COLUMN `totalItems` INT NOT NULL DEFAULT 0"],
      ["purchaseindents", "totalQty", "ADD COLUMN `totalQty` DECIMAL(10,2) NOT NULL DEFAULT 0"],
      ["purchaseindents", "totalItems", "ADD COLUMN `totalItems` INT NOT NULL DEFAULT 0"],
      ["purchasegrns", "totalQty", "ADD COLUMN `totalQty` DECIMAL(10,2) NOT NULL DEFAULT 0"],
      ["purchasegrns", "totalAmount", "ADD COLUMN `totalAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchasegrns", "totalItems", "ADD COLUMN `totalItems` INT NOT NULL DEFAULT 0"],
      ["purchasegrns", "grnType", "ADD COLUMN `grnType` VARCHAR(50) NOT NULL DEFAULT 'Against PO'"],
      ["purchasegrns", "verifiedBy", "ADD COLUMN `verifiedBy` VARCHAR(255) NOT NULL DEFAULT ''"],
      ["purchasegrns", "verifiedOn", "ADD COLUMN `verifiedOn` VARCHAR(255) NOT NULL DEFAULT ''"],
      ["consumptionissues", "totalQty", "ADD COLUMN `totalQty` DECIMAL(10,2) NOT NULL DEFAULT 0"],
      ["consumptionissues", "totalAmount", "ADD COLUMN `totalAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["consumptionissues", "totalItems", "ADD COLUMN `totalItems` INT NOT NULL DEFAULT 0"],
      ["openingstocks", "totalQty", "ADD COLUMN `totalQty` DECIMAL(10,2) NOT NULL DEFAULT 0"],
      ["openingstocks", "totalAmount", "ADD COLUMN `totalAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["openingstocks", "totalItems", "ADD COLUMN `totalItems` INT NOT NULL DEFAULT 0"],
    ];

    for (const [table, col, ddl] of patches) {
      const targetTable = dbTables.find(t => 
        t === table.toLowerCase() || 
        t === table.toLowerCase() + "s" || 
        (table.toLowerCase().endsWith("s") && t === table.toLowerCase().slice(0, -1))
      );
      
      if (targetTable) {
        try {
          await sequelize.query(`ALTER TABLE \`${targetTable}\` ${ddl}`);
          console.log(`Schema Enhancement: added ${targetTable}.${col}`);
        } catch (innerErr) {
          if (!innerErr.message.includes("Duplicate column name")) {
            console.warn(`Patch failed for ${targetTable}.${col}:`, innerErr.message);
          }
        }
      }
    }
  } catch (e) {
    console.warn("Schema enhancement (non-fatal):", e.message);
  }
}

// SQL Connection and Sync
ensureDatabaseExists()
  .then(() => sequelize.authenticate())
  .then(async () => {
    console.log("SQL Database Connected");
    return sequelize.sync();
  })
  .then(async () => {
    console.log("Database Synced");
    await ensureItemMovementTypeColumn();
    await ensureSchemaEnhancements();
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
app.use("/api/payment-terms", require("./routes/paymentTermRoutes"));
app.use("/api/items", require("./routes/itemRoutes"));
app.use("/api/purchase-indents", require("./routes/Purchaseindentroutes"));
app.use("/api/purchase-orders", require("./routes/purchaseOrderRoutes"));
app.use("/api/item-price-lists", require("./routes/itemPriceListRoutes"));
app.use("/api/grns", require("./routes/Grnroutes"));
app.use("/api/consumption-issues", require("./routes/consumptionIssueRoutes"));
app.use("/api/opening-stocks", require("./routes/openingStockRoutes"));
app.use("/api/company", require("./routes/companyRoutes"));
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