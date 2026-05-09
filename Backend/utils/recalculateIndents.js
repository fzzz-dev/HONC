const PurchaseIndent       = require("../model/purchaseIndent");
const PurchaseIndentDetail = require("../model/purchaseIndentDetail");
const PurchaseOrder        = require("../model/purchaseOrder");
const PurchaseOrderDetail  = require("../model/purchaseOrderDetail");
const { Op } = require("sequelize");

/**
 * Recalculates alPoQty / balQty for every PurchaseIndentDetail row,
 * then auto-closes/re-opens parent Indents.
 * Uses direct Model.update() with hooks:false — never triggers afterSave.
 */
async function recalculateIndents() {
  try {
    // 1. Build map: indentDetailId -> total poQty across all non-cancelled POs
    const poDetails = await PurchaseOrderDetail.findAll({
      attributes: ["indentDetailId", "poQty"],
      raw: true,
    });

    const poQtyMap = {};
    for (const d of poDetails) {
      if (!d.indentDetailId) continue;
      const key = String(d.indentDetailId);
      poQtyMap[key] = (poQtyMap[key] || 0) + Number(d.poQty || 0);
    }

    // 2. Load all indent details and update those that changed
    const indentDetails = await PurchaseIndentDetail.findAll({
      attributes: ["id", "purchaseIndentId", "indentQty", "alPoQty", "balQty"],
      raw: true,
    });

    // Track which indents were touched
    const affectedIndentIds = new Set();

    for (const d of indentDetails) {
      const key      = String(d.id);
      const alPoQty  = poQtyMap[key] || 0;
      const balQty   = Math.max(0, Number(d.indentQty || 0) - alPoQty);

      if (Number(d.alPoQty || 0) !== alPoQty || Number(d.balQty || 0) !== balQty) {
        await PurchaseIndentDetail.update(
          { alPoQty, balQty },
          { where: { id: d.id }, hooks: false }
        );
        affectedIndentIds.add(d.purchaseIndentId);
      }
    }

    // 3. For each affected indent, auto-close or re-open
    for (const indentId of affectedIndentIds) {
      const allDetails = await PurchaseIndentDetail.findAll({
        where: { purchaseIndentId: indentId },
        attributes: ["balQty"],
        raw: true,
      });

      const allDone = allDetails.length > 0 && allDetails.every(d => Number(d.balQty || 0) <= 0);

      if (allDone) {
        await PurchaseIndent.update(
          { status: "Closed" },
          { where: { id: indentId }, hooks: false }
        );
      } else {
        // Re-open only if it was previously auto-closed
        await PurchaseIndent.update(
          { status: "Open" },
          { where: { id: indentId, status: "Closed" }, hooks: false }
        );
      }
    }
  } catch (err) {
    console.error("recalculateIndents error:", err.message);
  }
}

module.exports = { recalculateIndents };