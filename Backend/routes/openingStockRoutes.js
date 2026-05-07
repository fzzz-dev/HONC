const express = require("express");
const router = express.Router();
const openingStockController = require("../controller/openingStockController");

router.get("/", openingStockController.getAll);
router.get("/next-number", openingStockController.getNextNumber);
router.get("/:id", openingStockController.getById);
router.post("/", openingStockController.create);
router.put("/:id", openingStockController.update);
router.delete("/:id", openingStockController.delete);

module.exports = router;
