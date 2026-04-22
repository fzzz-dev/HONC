const PurchaseOrder = require("../model/purchaseOrder");
const PurchaseIndent = require("../model/purchaseIndent");
const { Op } = require("sequelize");

async function recalculateIndents() {
  // 1. Gather ALL non-Cancelled POs that have details
  const activePOs = await PurchaseOrder.findAll({
    where: {
      status: { [Op.ne]: "Cancelled" },
    },
  });

  // Build a map: indentDetailId (string) -> total poQty
  const poQtyMap = {}; 
  for (const po of activePOs) {
    const details = po.details || [];
    for (const d of details) {
      if (!d.indentDetailId) continue;
      const key = String(d.indentDetailId);
      poQtyMap[key] = (poQtyMap[key] || 0) + (d.poQty || 0);
    }
  }

  // 2. Load all indents and update each detail row
  const indents = await PurchaseIndent.findAll();

  for (const indent of indents) {
    let changed = false;
    const newDetails = (indent.details || []).map((d) => {
      const key = String(d.id || d._id); // Handle both id and _id just in case
      const alPoQty = poQtyMap[key] || 0;
      const balQty = Math.max(0, (d.indentQty || 0) - alPoQty);
      if (d.alPoQty !== alPoQty || d.balQty !== balQty) {
        changed = true;
        return { ...d, alPoQty, balQty };
      }
      return d;
    });

    if (changed) {
      indent.details = newDetails;
      await indent.save();
    }
  }
}

module.exports = { recalculateIndents };