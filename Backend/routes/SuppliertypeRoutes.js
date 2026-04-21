const express = require("express");
const router = express.Router();
const {
  getAllSupplierTypes,
  getSupplierType,
  createSupplierType,
  updateSupplierType,
  deleteSupplierType,
  reorderSupplierTypes,
} = require("../controller/Suppliertypecontroller");

// Main supplier type routes
router.route("/").get(getAllSupplierTypes).post(createSupplierType);

// Reorder route (must be before /:id)
router.route("/reorder").put(reorderSupplierTypes);

router
  .route("/:id")
  .get(getSupplierType)
  .put(updateSupplierType)
  .delete(deleteSupplierType);

module.exports = router;
