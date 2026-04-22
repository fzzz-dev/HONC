const express = require("express");
const router = express.Router();

const inventoryHeadController = require("../controller/Inventoryheadcontroller");
const mainCategoryController = require("../controller/Maincategorycontroller");
const uomController = require("../controller/uomcontroller");


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

// ── Inventory Heads (KEEP LAST) ─────────────
router.get("/", inventoryHeadController.getAll);
router.get("/:id", inventoryHeadController.getOne);
router.post("/", inventoryHeadController.create);
router.put("/:id", inventoryHeadController.update);
router.delete("/:id", inventoryHeadController.remove);

module.exports = router;
