const express = require("express");
const router = express.Router();
const {
  getAllSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addAddress,
  updateAddress,
  deleteAddress,
  getSuppliersByType,
} = require("../controller/supplierController"); // ✅ fix typo here

router.route("/").get(getAllSuppliers).post(createSupplier);

// ✅ Must be BEFORE /:id — otherwise Express treats "type" as an id value
router.route("/type/:type").get(getSuppliersByType);

router
  .route("/:id")
  .get(getSupplier)
  .put(updateSupplier)
  .delete(deleteSupplier);

router.route("/:id/addresses").post(addAddress);
router
  .route("/:id/addresses/:addressId")
  .put(updateAddress)
  .delete(deleteAddress);

module.exports = router;
