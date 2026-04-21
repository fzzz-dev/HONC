// controllers/purchaseOrderController.js
const mongoose = require("mongoose");
const PurchaseOrder = require("../model/purchaseOrder");
const PurchaseIndent = require("../model/purchaseIndent");
const Supplier = require("../model/suPplier");

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Generate next PO number:  PO-YYYY-001 */
async function generatePoNo() {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await PurchaseOrder.findOne(
    { poNo: { $regex: `^${prefix}` } },
    { poNo: 1 },
    { sort: { poNo: -1 } },
  ).lean();

  let seq = 1;
  if (last) {
    const match = last.poNo.match(/^PO-\d{4}-(\d+)$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/** Recalculate computed fields for a single detail row.
 *  gstType: "local" → sgst + cgst; "other" → igst only
 */
function calcDetail(d, gstEnabled, gstType) {
  const baseAmt = (d.poQty || 0) * (d.poRate || 0);

  let discPct = d.discPct || 0;
  let discPrice = d.discPrice || 0;

  if (d.discMode === "price") {
    discPrice = d.discPrice || 0;
    discPct = baseAmt > 0 ? (discPrice / baseAmt) * 100 : 0;
  } else {
    discPct = d.discPct || 0;
    discPrice = baseAmt * (discPct / 100);
  }

  const netAmt = baseAmt - discPrice;
  const gst = gstEnabled ? netAmt * ((d.gstPct || 0) / 100) : 0;

  let sgst = 0,
    cgst = 0,
    igst = 0;
  if (gstEnabled) {
    if (gstType === "other") {
      igst = gst;
    } else {
      sgst = gst / 2;
      cgst = gst / 2;
    }
  }

  return {
    ...d,
    discPct: +discPct.toFixed(4),
    discPrice: +discPrice.toFixed(2),
    poAmount: +netAmt.toFixed(2),
    sgst: +sgst.toFixed(2),
    cgst: +cgst.toFixed(2),
    igst: +igst.toFixed(2),
    totGst: +gst.toFixed(2),
    totalAmount: +(netAmt + gst).toFixed(2),
  };
}

// ─── GET /api/purchase-orders/next-number ────────────────────────────────────
exports.getNextNumber = async (req, res) => {
  try {
    const poNo = await generatePoNo();
    res.json({ poNo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders/indents ────────────────────────────────────────
// Returns all Open purchase indents (with alPoQty/balQty) for the PO form.
// NOTE: we always return ALL Open indents regardless of balQty — the frontend
//       can show remaining balance but must not hide indents that are "full".
exports.getIndentsForPO = async (req, res) => {
  try {
    const indents = await PurchaseIndent.find({ status: "Open" })
      .sort({ indentNo: 1 })
      .lean();
    res.json(indents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders/suppliers ──────────────────────────────────────
// Returns all active suppliers for the PO form dropdown
exports.getSuppliersForPO = async (req, res) => {
  try {
    const suppliers = await Supplier.find({}).sort({ supplierName: 1 }).lean();
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders ────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const pos = await PurchaseOrder.find({}).sort({ createdAt: -1 }).lean();
    res.json(pos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders/:id ────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).lean();
    if (!po) return res.status(404).json({ message: "PO not found" });
    res.json(po);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/purchase-orders ───────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const {
      poNo,
      date,
      supplierId,
      supplierName, // This will be overridden from DB
      gstEnabled = true,
      gstType = "local",
      createdBy,
      createdOn,
      status,
      remarks,
      details = [],
    } = req.body;

    if (!poNo) return res.status(400).json({ message: "poNo is required" });

    // Fetch supplier name from database
    let finalSupplierName = supplierName;
    if (supplierId) {
      const supplier = await Supplier.findById(supplierId).lean();
      if (supplier) {
        finalSupplierName = supplier.supplierName;
      } else {
        return res.status(404).json({ message: "Supplier not found" });
      }
    }

    // Recalculate every detail row
    const computedDetails = details.map((d) =>
      calcDetail(d, gstEnabled, gstType),
    );

    const po = new PurchaseOrder({
      poNo,
      date,
      supplierId: supplierId || null,
      supplierName: finalSupplierName,
      gstEnabled,
      gstType,
      createdBy,
      createdOn,
      status,
      remarks,
      details: computedDetails,
    });

    await po.save(); // post-save hook recalculates indent balances
    res.status(201).json(po);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "PO number already exists" });
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/purchase-orders/:id ────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const {
      poNo,
      date,
      supplierId,
      supplierName, // This will be overridden from DB
      gstEnabled = true,
      gstType = "local",
      createdBy,
      createdOn,
      status,
      remarks,
      details = [],
    } = req.body;

    // Fetch supplier name from database
    let finalSupplierName = supplierName;
    if (supplierId) {
      const supplier = await Supplier.findById(supplierId).lean();
      if (supplier) {
        finalSupplierName = supplier.supplierName;
      } else {
        return res.status(404).json({ message: "Supplier not found" });
      }
    }

    const computedDetails = details.map((d) =>
      calcDetail(d, gstEnabled, gstType),
    );

    const updated = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      {
        poNo,
        date,
        supplierId: supplierId || null,
        supplierName: finalSupplierName,
        gstEnabled,
        gstType,
        createdBy,
        createdOn,
        status,
        remarks,
        details: computedDetails,
      },
      { new: true, runValidators: true },
    );

    if (!updated) return res.status(404).json({ message: "PO not found" });
    // post findOneAndUpdate hook fires recalculate
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/purchase-orders/:id ─────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const deleted = await PurchaseOrder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "PO not found" });
    // post findOneAndDelete hook fires recalculate
    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
