const PurchaseOrder = require("../model/purchaseOrder");
const PurchaseIndent = require("../model/purchaseIndent");
const Supplier = require("../model/supplier");
const PaymentTerm = require("../model/paymentTerm");
const { Op } = require("sequelize");

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Generate next PO number:  PO-YYYY-001 */
async function generatePoNo() {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await PurchaseOrder.findOne({
    where: {
      poNo: { [Op.like]: `${prefix}%` }
    },
    order: [["poNo", "DESC"]]
  });

  let seq = 1;
  if (last) {
    const match = last.poNo.match(/^PO-\d{4}-(\d+)$/);
    if (match) seq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

/** Recalculate computed fields for a single detail row. */
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

  let sgst = 0, cgst = 0, igst = 0;
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
    id: d.id || d._id || Date.now() + Math.random(),
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
exports.getIndentsForPO = async (req, res) => {
  try {
    const indents = await PurchaseIndent.findAll({
      where: { status: "Open" },
      order: [["indentNo", "ASC"]],
    });
    res.json(indents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders/suppliers ──────────────────────────────────────
exports.getSuppliersForPO = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      order: [["supplierName", "ASC"]],
    });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders ────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const pos = await PurchaseOrder.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.json(pos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders/:id ────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
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
      supplierName,
      paymentTermsId,
      gstEnabled = true,
      gstType = "local",
      createdBy,
      createdOn,
      status,
      remarks,
      details = [],
    } = req.body;

    if (!poNo) return res.status(400).json({ message: "poNo is required" });

    let finalSupplierName = supplierName;
    if (supplierId) {
      const supplier = await Supplier.findByPk(supplierId);
      if (supplier) {
        finalSupplierName = supplier.supplierName;
      } else {
        return res.status(404).json({ message: "Supplier not found" });
      }
    }

    let ptId = paymentTermsId ? parseInt(paymentTermsId, 10) : null;
    let paymentTermsName = "";
    if (ptId) {
      const pt = await PaymentTerm.findByPk(ptId);
      if (!pt) return res.status(400).json({ message: "Invalid payment terms" });
      paymentTermsName = pt.name;
    } else {
      ptId = null;
    }

    const computedDetails = details.map((d) => calcDetail(d, gstEnabled, gstType));

    const po = await PurchaseOrder.create({
      poNo,
      date,
      supplierId: supplierId || null,
      supplierName: finalSupplierName,
      paymentTermsId: ptId,
      paymentTermsName,
      gstEnabled,
      gstType,
      createdBy,
      createdOn,
      status,
      remarks,
      details: computedDetails,
    });

    res.status(201).json(po);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return res.status(409).json({ message: "PO number already exists" });
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/purchase-orders/:id ────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: "PO not found" });

    const {
      poNo,
      date,
      supplierId,
      supplierName,
      paymentTermsId,
      gstEnabled = true,
      gstType = "local",
      createdBy,
      createdOn,
      status,
      remarks,
      details = [],
    } = req.body;

    let finalSupplierName = supplierName;
    if (supplierId) {
      const supplier = await Supplier.findByPk(supplierId);
      if (supplier) {
        finalSupplierName = supplier.supplierName;
      }
    }

    let ptId = paymentTermsId ? parseInt(paymentTermsId, 10) : null;
    let paymentTermsName = "";
    if (ptId) {
      const pt = await PaymentTerm.findByPk(ptId);
      if (!pt) return res.status(400).json({ message: "Invalid payment terms" });
      paymentTermsName = pt.name;
    } else {
      ptId = null;
    }

    const computedDetails = details.map((d) => calcDetail(d, gstEnabled, gstType));

    await po.update({
      poNo,
      date,
      supplierId: supplierId || null,
      supplierName: finalSupplierName,
      paymentTermsId: ptId,
      paymentTermsName,
      gstEnabled,
      gstType,
      createdBy,
      createdOn,
      status,
      remarks,
      details: computedDetails,
    });

    res.json(po);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/purchase-orders/:id ─────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: "PO not found" });
    await po.destroy();
    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
