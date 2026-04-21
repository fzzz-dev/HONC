const express = require("express");
const router = express.Router();
const grnController = require("../controller/Grncontroller");

// GET routes
router.get("/", grnController.getAllGRNs);
router.get("/next-number", grnController.getNextGRNNumber);
router.get("/by-po/:poId", grnController.getGRNsByPO);
router.get("/pending-po-items", grnController.getPendingPOItems);
router.get("/expiring-items", grnController.getExpiringItems);
router.get("/:id", grnController.getGRNById);

// POST routes
router.post("/", grnController.createGRN);

// PUT routes
router.put("/:id", grnController.updateGRN);

// DELETE routes
router.delete("/:id", grnController.deleteGRN);

module.exports = router;