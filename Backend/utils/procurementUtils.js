const PurchaseIndentDetail = require("../model/purchaseIndentDetail");
const PurchaseIndent      = require("../model/purchaseIndent");
const PurchaseOrderDetail = require("../model/purchaseOrderDetail"); // direct require — no sequelize.models
const { Op } = require("sequelize");

/**
 * Updates alPoQty / balQty on a PurchaseIndentDetail row,
 * then auto-closes or re-opens the parent Indent.
 *
 * Uses Model.update() (not instance.save()) so no afterSave hooks fire.
 */
async function updateIndentBalance(indentDetailId) {
  if (!indentDetailId) return;

  try {
    // 1. Sum all non-cancelled PO qty for this indent detail
    const rows = await PurchaseOrderDetail.findAll({
      where: { indentDetailId: String(indentDetailId) },
      attributes: ["poQty"],
      raw: true,
    });

    const totalPoQty = rows.reduce((s, r) => s + Number(r.poQty || 0), 0);

    // 2. Load the indent detail
    const detail = await PurchaseIndentDetail.findByPk(indentDetailId);
    if (!detail) return;

    const indentQty = Number(detail.indentQty || 0);
    const alPoQty   = totalPoQty;
    const balQty    = Math.max(0, indentQty - alPoQty);

    // Use Model.update with where clause — does NOT fire instance hooks
    await PurchaseIndentDetail.update(
      { alPoQty, balQty },
      { where: { id: indentDetailId }, hooks: false }
    );

    // 3. Auto-close / re-open the parent indent
    const indentId  = detail.purchaseIndentId;
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
      // Re-open if it was auto-closed before
      await PurchaseIndent.update(
        { status: "Open" },
        { where: { id: indentId, status: "Closed" }, hooks: false }
      );
    }
  } catch (err) {

  }
}

module.exports = { updateIndentBalance };
