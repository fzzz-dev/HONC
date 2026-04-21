// utils/recalculateIndents.js
//
// Recomputes alPoQty and balQty for every detail row across all PurchaseIndents.
// Called automatically after any PurchaseOrder create / update / delete.
//
// Rules:
//   alPoQty = sum of poQty on all NON-Cancelled PO detail rows that reference
//             the same indentDetailId (detail._id on the indent).
//   balQty  = indentQty - alPoQty   (floored at 0)

const mongoose = require("mongoose");

async function recalculateIndents() {
  // Lazy-load to avoid circular-require issues at startup
  const PurchaseOrder = require("../model/purchaseOrder");
  const PurchaseIndent = require("../model/purchaseIndent");

  // Gather ALL non-Cancelled PO detail rows that have an indentDetailId
  const activePOs = await PurchaseOrder.find({
    status: { $ne: "Cancelled" },
    "details.indentDetailId": { $exists: true, $ne: null },
  }).lean();

  // Build a map:  indentDetailId (string) → total poQty
  const poQtyMap = {}; // key: String(indentDetailId)
  for (const po of activePOs) {
    for (const d of po.details) {
      if (!d.indentDetailId) continue;
      const key = String(d.indentDetailId);
      poQtyMap[key] = (poQtyMap[key] || 0) + (d.poQty || 0);
    }
  }

  // Load all indents and update each detail row
  const indents = await PurchaseIndent.find({}).lean();

  const bulkOps = [];
  for (const indent of indents) {
    let changed = false;
    const newDetails = (indent.details || []).map((d) => {
      const key = String(d._id);
      const alPoQty = poQtyMap[key] || 0;
      const balQty = Math.max(0, (d.indentQty || 0) - alPoQty);
      if (d.alPoQty !== alPoQty || d.balQty !== balQty) {
        changed = true;
        return { ...d, alPoQty, balQty };
      }
      return d;
    });

    if (changed) {
      bulkOps.push({
        updateOne: {
          filter: { _id: indent._id },
          update: { $set: { details: newDetails } },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await PurchaseIndent.bulkWrite(bulkOps);
  }
}

module.exports = { recalculateIndents };