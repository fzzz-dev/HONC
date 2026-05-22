const PurchaseOrder       = require("../model/purchaseOrder");
const PurchaseOrderDetail = require("../model/purchaseOrderDetail");
const PurchaseGRN         = require("../model/purchaseGRN");
const PurchaseGRNDetail   = require("../model/purchaseGRNDetail");
const { Op } = require("sequelize");

/**
 * Recalculates alGrnQty / balQty for every PurchaseOrderDetail row.
 * Uses direct Model.update() with hooks:false — never triggers afterSave.
 */
async function recalculatePOGRNQuantities() {
  try {
    // 1. Build map: poDetailId -> total grnQty across all active (non-cancelled) GRNs
    const grns = await PurchaseGRN.findAll({
      where: { status: { [Op.ne]: "Cancelled" } },
      include: [{ association: "details", attributes: ["poDetailId", "grnQty"] }]
    });

    const grnQtyMap = {};
    for (const grn of grns) {
      if (!grn.details) continue;
      for (const d of grn.details) {
        if (!d.poDetailId) continue;
        const key = String(d.poDetailId);
        grnQtyMap[key] = (grnQtyMap[key] || 0) + Number(d.grnQty || 0);
      }
    }

    // 2. Load all PO details and update those whose balance changed
    const poDetails = await PurchaseOrderDetail.findAll({
      attributes: ["id", "poQty", "alGrnQty", "balQty"],
      raw: true,
    });

    for (const d of poDetails) {
      const key       = String(d.id);
      const alGrnQty  = grnQtyMap[key] || 0;
      const balQty    = Math.max(0, Number(d.poQty || 0) - alGrnQty);

      // Only write if something changed
      if (Number(d.alGrnQty || 0) !== alGrnQty || Number(d.balQty || 0) !== balQty) {
        await PurchaseOrderDetail.update(
          { alGrnQty, balQty },
          { where: { id: d.id }, hooks: false }
        );
      }
    }
  } catch (err) {
    console.error("recalculatePOGRNQuantities error:", err.message);
  }
}

module.exports = { recalculatePOGRNQuantities };
