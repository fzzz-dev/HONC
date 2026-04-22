// routes/purchaseOrderRoutes.js
// Example route configuration - add this to your existing routes

const express = require("express");
const router = express.Router();
const poController = require("../controller/Purchaseordercontroller");


// Get next PO number
router.get("/next-number", poController.getNextNumber);

// Get open indents for PO form
router.get("/indents", poController.getIndentsForPO);

// Get suppliers for PO form (NEW ENDPOINT)
router.get("/suppliers", poController.getSuppliersForPO);

// CRUD operations
router.get("/", poController.getAll);
router.get("/:id", poController.getOne);
router.post("/", poController.create);
router.put("/:id", poController.update);
router.delete("/:id", poController.remove);

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// In your main app.js or server.js, mount these routes:
//
// const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
// app.use('/api/purchase-orders', purchaseOrderRoutes);
// ─────────────────────────────────────────────────────────────────────────────
