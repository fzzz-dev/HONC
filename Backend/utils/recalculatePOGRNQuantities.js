const PurchaseOrder = require("../model/purchaseOrder");
const PurchaseGRN = require("../model/purchaseGRN");

async function recalculatePOGRNQuantities() {
  // Gather all non-cancelled GRNs
  const activeGRNs = await PurchaseGRN.findAll({
    where: {
      status: { [require("sequelize").Op.ne]: "Cancelled" },
    },
  });

  // Map: poDetailId -> total grnQty
  const grnQtyMap = {};
  for (const grn of activeGRNs) {
    const details = grn.details || [];
    for (const d of details) {
      if (!d.poDetailId) continue;
      const key = String(d.poDetailId);
      grnQtyMap[key] = (grnQtyMap[key] || 0) + (d.grnQty || 0);
    }
  }

  // Load all POs and update balances
  const pos = await PurchaseOrder.findAll();
  for (const po of pos) {
    let changed = false;
    const newDetails = (po.details || []).map((d) => {
      const key = String(d.id || d._id);
      const alGrnQty = grnQtyMap[key] || 0;
      const balQty = Math.max(0, (d.poQty || 0) - alGrnQty);
      if (d.alGrnQty !== alGrnQty || d.balQty !== balQty) {
        changed = true;
        return { ...d, alGrnQty, balQty };
      }
      return d;
    });

    if (changed) {
      po.details = newDetails;
      await po.save();
    }
  }
}

module.exports = { recalculatePOGRNQuantities };
