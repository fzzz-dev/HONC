const express = require("express");
const router = express.Router();

const ItemPriceListController = require("../controller/Itempricelistcontroller");

// Optional: auth middleware (if you have)
// const { protect } = require("../middleware/authMiddleware");

/**
 * CREATE
 */
router.post(
  "/",
  // protect,
  ItemPriceListController.create,
);

/**
 * GET ALL (with filters, pagination)
 */
router.get(
  "/",
  // protect,
  ItemPriceListController.getAll,
);

/**
 * SEARCH (advanced)
 */
router.get(
  "/search",
  // protect,
  ItemPriceListController.search,
);

/**
 * GET EXPIRED
 */
router.get(
  "/expired",
  // protect,
  ItemPriceListController.getExpired,
);

/**
 * GET BY SUPPLIER
 */
router.get(
  "/supplier/:supplierId",
  // protect,
  ItemPriceListController.getBySupplier,
);

/**
 * GET ITEM PRICES (compare suppliers)
 */
router.get(
  "/item/:itemId",
  // protect,
  ItemPriceListController.getItemPrices,
);

/**
 * GET SINGLE BY ID
 */
router.get(
  "/:id",
  // protect,
  ItemPriceListController.getById,
);

/**
 * UPDATE
 */
router.put(
  "/:id",
  // protect,
  ItemPriceListController.update,
);

/**
 * DELETE (soft delete)
 */
router.delete(
  "/:id",
  // protect,
  ItemPriceListController.delete,
);

/**
 * BULK UPDATE STATUS
 */
router.put(
  "/bulk/status",
  // protect,
  ItemPriceListController.bulkUpdateStatus,
);

/**
 * EXPORT (JSON / CSV)
 */
router.get(
  "/export/:id",
  // protect,
  ItemPriceListController.export,
);

module.exports = router;
