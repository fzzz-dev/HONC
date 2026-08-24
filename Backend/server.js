const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const sequelize = require("./config/database");
const models = require("./model");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create database if not exists
async function ensureDatabaseExists() {
  console.log("DB_HOST =", process.env.DB_HOST);
  console.log("DB_USER =", process.env.DB_USER);
  console.log("DB_PASSWORD =", process.env.DB_PASSWORD);
  console.log("DB_NAME =", process.env.DB_NAME);
  const mysql = require("mysql2/promise");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`,
  );
  await connection.end();
  

}

const seedData = async () => {
  const { User, Role } = require("./model");

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

  }
};

const ensureItemMovementTypeColumn = async () => {
  const dbName = process.env.DB_NAME;
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

  }
};

async function ensureSchemaEnhancements() {
  try {
    const [tables] = await sequelize.query("SHOW TABLES");
    const dbTables = tables.map(t => Object.values(t)[0]);



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
      ["purchaseorders", "totalAmount", "ADD COLUMN `totalAmount` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "roundoff", "ADD COLUMN `roundoff` DECIMAL(15,2) NOT NULL DEFAULT 0"],
      ["purchaseorders", "poType", "ADD COLUMN `poType` VARCHAR(255) NOT NULL DEFAULT ''"],
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

    let addedCount = 0;
    for (const [table, col, ddl] of patches) {
      const targetTable = dbTables.find(t => 
        t.toLowerCase() === table.toLowerCase() || 
        t.toLowerCase() === table.toLowerCase() + "s" || 
        (table.toLowerCase().endsWith("s") && t.toLowerCase() === table.toLowerCase().slice(0, -1))
      );
      
      if (targetTable) {
        try {
          await sequelize.query(`ALTER TABLE \`${targetTable}\` ${ddl}`);
          addedCount++;

        } catch (innerErr) {
          if (!innerErr.message.includes("Duplicate column name")) {

          }
        }
      }
    }

  } catch (e) {

  }
}

// Start server function
async function startServer() {
  try {

    
    await ensureDatabaseExists();

    
    await sequelize.authenticate();

    await ensureSchemaEnhancements();
    await sequelize.sync();


    await ensureItemMovementTypeColumn();
    await seedData();

    // ========== REGISTER ALL ROUTES AFTER DATABASE IS READY ==========


    app.use("/api/countries", require("./routes/countryRoutes"));
    app.use("/api/states", require("./routes/stateRoutes"));
    app.use("/api/cities", require("./routes/cityRoutes"));
    app.use("/api/inventory-heads", require("./routes/InventoryRoutes"));
    app.use("/api/stores", require("./routes/Storeroutes"));
    app.use("/api/departments", require("./routes/Departmentroutes"));
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
    app.use("/api/factories", require("./routes/factoryRoutes"));
    app.use("/api/reports", require("./routes/reportRoutes"));
    app.use("/api/level", require("./routes/levelRoutes"));
    app.use("/api/hr/departments", require("./routes/hrms/hrDepartmentRoutes"));
    app.use("/api/hr/designations", require("./routes/hrms/hrDesignationRoutes"));
    app.use("/api/hr/shifts", require("./routes/hrms/hrShiftRoutes"));  
    app.use("/api/hr/employees", require("./routes/hrms/hrEmployeeRoutes"));
    app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
    app.use("/api/issue-types", require("./routes/issueTypeRoutes")); 

    // ========== PRODUCTION MASTER ROUTES (NEW) ==========
    app.use("/api/production-masters/colors", require("./routes/ProductionMasters/colorRoutes"));
    app.use("/api/production-masters/counts", require("./routes/ProductionMasters/countsRoutes"));
    app.use("/api/production-masters/yarn-types", require("./routes/ProductionMasters/yarnTypeRoutes"));
    app.use("/api/production-masters/mills", require("./routes/ProductionMasters/millRoutes"));
    app.use("/api/production-masters/processes", require("./routes/ProductionMasters/processRoutes"));
    


    // Test routes
    app.get("/test-simple", (req, res) => {
      res.json({ message: "Simple test works!" });
    });

    app.get("/health", (req, res) => {
      res.json({ status: "OK", message: "Server is running (SQL Mode)" });
    });

    // Global error handler
    app.use((err, req, res, next) => {

      res.status(500).json({
        success: false,
        message: err.message || "Internal Server Error",
      });
    });

    const PORT = process.env.PORT;
    app.listen(PORT, () => {



    });
  } catch (err) {

    process.exit(1);
}
}

startServer();

