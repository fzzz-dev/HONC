const express = require("express");
const router = express.Router();

const inventoryHeadController = require("../controller/Inventoryheadcontroller");
const mainCategoryController = require("../controller/Maincategorycontroller");
const uomController = require("../controller/uomcontroller");
const inventoryStockFlowController = require("../controller/inventoryStockFlowController");

// Debug: Log what functions are available



// ── Main Categories ─────────────────────────
router.get("/main-categories", mainCategoryController.getAll);
router.get("/main-categories/:id", mainCategoryController.getOne);
router.post("/main-categories", mainCategoryController.create);
router.put("/main-categories/:id", mainCategoryController.update);
router.delete("/main-categories/:id", mainCategoryController.remove);

// ── UOM ─────────────────────────────────────
router.get("/uoms", uomController.getAll);
router.get("/uoms/:id", uomController.getOne);
router.post("/uoms", uomController.create);
router.put("/uoms/:id", uomController.update);
router.delete("/uoms/:id", uomController.remove);

// ── Stock Routes ─────────────────────────────
router.get("/stock/current", inventoryStockFlowController.getCurrentStock);
router.get("/stock/for-items", inventoryStockFlowController.getStockForItems);
router.get("/stock/flow", inventoryStockFlowController.getInventoryStockFlowReport);
router.get("/stock/summary", inventoryStockFlowController.getReportSummary);
router.get("/stock/date-range", inventoryStockFlowController.getDateRange);
router.get("/stock/export", inventoryStockFlowController.exportToCSV);

// ── Inventory Heads ─────────────────────────────
router.get("/", inventoryHeadController.getAll);
router.get("/:id", inventoryHeadController.getOne);
router.post("/", inventoryHeadController.create);
router.put("/:id", inventoryHeadController.update);
// FIX: The method might be called 'delete' or 'remove' - check your controller
router.delete("/:id", inventoryHeadController.delete || inventoryHeadController.remove);

module.exports = router;