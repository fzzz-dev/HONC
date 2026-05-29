const PurchaseOrder = require("../model/purchaseOrder");
const PurchaseOrderDetail = require("../model/purchaseOrderDetail");
const PurchaseIndent = require("../model/purchaseIndent");
const Supplier = require("../model/supplier");
const PaymentTerm = require("../model/paymentTerm");
const { Op } = require("sequelize");
const { updateIndentBalance } = require("../utils/procurementUtils");

// ─── helpers ──────────────────────────────────────────────────────────────────

function getFinancialYear() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  if (month < 4) return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
  return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
}

/** Generate next PO number: PO/0001/2026-2027 */
async function generatePoNo() {
  const fy = getFinancialYear();
  const prefix = "PO/";
  const last = await PurchaseOrder.findOne({
    where: {
      poNo: { [Op.like]: `${prefix}%/${fy}` }
    },
    order: [["poNo", "DESC"]]
  });

  let seq = 1;
  if (last) {
    const parts = last.poNo.split("/");
    if (parts.length === 3) {
      seq = parseInt(parts[1], 10) + 1;
    }
  }
  return `${prefix}${String(seq).padStart(4, "0")}/${fy}`;
}

/** Recalculate computed fields for a single detail row. */
function calcDetail(d, gstEnabled, gstType) {
  const baseAmt = Number(d.poQty || 0) * Number(d.poRate || 0);

  let discPct = 0;
  let discPrice = 0;

  if (d.discMode === "price") {
    discPrice = Number(d.discPrice || 0);
    discPct = baseAmt > 0 ? (discPrice / baseAmt) * 100 : 0;
  } else {
    discPct = Number(d.discPct || 0);
    discPrice = baseAmt * (discPct / 100);
  }

  const netAmt = baseAmt - discPrice;
  const gst = gstEnabled ? netAmt * (Number(d.gstPct || 0) / 100) : 0;

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
      include: ["details"],
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
      include: ["details"],
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
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: ["details"]
    });
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
      poType,
      date,
      deliveryDate,  // ← ADD THIS
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
      level1Approved = "No",  
      level2Approved = "No",  
      level1ApprovedBy = null,  
      level1ApprovedDate = null,  
      level2ApprovedBy = null,  
      level2ApprovedDate = null,  
    } = req.body;

    if (!poNo) return res.status(400).json({ message: "poNo is required" });
    if (!poType) return res.status(400).json({ message: "poType is required" });

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
    
    // Calculate summaries
    let grossAmount = 0, discAmount = 0, poAmount = 0, igstAmount = 0, cgstAmount = 0, sgstAmount = 0;
    let totalAmount = 0;
    computedDetails.forEach(d => {
      const qty = Number(d.poQty || 0);
      const rate = Number(d.poRate || 0);
      grossAmount += qty * rate;
      discAmount += Number(d.discPrice || 0);
      poAmount += Number(d.poAmount || 0);
      igstAmount += Number(d.igst || 0);
      cgstAmount += Number(d.cgst || 0);
      sgstAmount += Number(d.sgst || 0);
      totalAmount += Number(d.totalAmount || 0);
    });
    
    totalAmount = +totalAmount.toFixed(2);
    const netAmount = Math.floor(totalAmount);
    const roundOff = +(netAmount - totalAmount).toFixed(2);

    const po = await PurchaseOrder.create({
      poNo,
      poType,
      date,
      deliveryDate,  // ← ADD THIS
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
      grossAmount,
      discAmount,
      poAmount,
      igstAmount,
      cgstAmount,
      sgstAmount,
      netAmount,
      totalAmount,
      roundoff: roundOff,
      totalItems: computedDetails.length,
      level1Approved,
      level2Approved,
      level1ApprovedBy,
      level1ApprovedDate,
      level2ApprovedBy,
      level2ApprovedDate,
      details: computedDetails,
    }, { include: ["details"] });

    // Sync Indent Balances
    const affectedIndentDetails = [...new Set(details.map(d => d.indentDetailId).filter(Boolean))];
    for (const id of affectedIndentDetails) {
      await updateIndentBalance(id);
    }

    res.status(201).json(po);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return res.status(409).json({ message: "PO number already exists" });
    console.error("Create PO error:", err);
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
      deliveryDate,  // ← ADD THIS
      supplierId,
      supplierName,
      paymentTermsId,
      gstEnabled = true,
      gstType = "local",
      createdBy,
      createdOn,
      status,
      remarks,
      poType,
      details = [],
      level1Approved,
      level2Approved,
      level1ApprovedBy,
      level1ApprovedDate,
      level2ApprovedBy,
      level2ApprovedDate,
    } = req.body;

    console.log("Updating PO ID:", req.params.id, "with deliveryDate:", deliveryDate); // Debug log

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

    let grossAmount = 0, discAmount = 0, poAmount = 0, igstAmount = 0, cgstAmount = 0, sgstAmount = 0;
    let totalAmount = 0;
    computedDetails.forEach(d => {
      const qty = Number(d.poQty || 0);
      const rate = Number(d.poRate || 0);
      grossAmount += qty * rate;
      discAmount += Number(d.discPrice || 0);
      poAmount += Number(d.poAmount || 0);
      igstAmount += Number(d.igst || 0);
      cgstAmount += Number(d.cgst || 0);
      sgstAmount += Number(d.sgst || 0);
      totalAmount += Number(d.totalAmount || 0);
    });
    
    totalAmount = +totalAmount.toFixed(2);
    const netAmount = Math.round(totalAmount);
    const roundOff = +(totalAmount - netAmount).toFixed(2);

    // Track affected indents before and after update
    const oldDetails = await PurchaseOrderDetail.findAll({ where: { purchaseOrderId: po.id } });
    const oldIndentDetailIds = oldDetails.map(d => d.indentDetailId).filter(Boolean);

    await po.update({
      poNo,
      poType,
      date,
      deliveryDate,  // ← ADD THIS
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
      grossAmount,
      discAmount,
      poAmount,
      igstAmount,
      cgstAmount,
      sgstAmount,
      netAmount,
      totalAmount,
      roundoff: roundOff,
      totalItems: computedDetails.length,
    });

      // Only add approval fields if they are provided
    if (level1Approved !== undefined) updateData.level1Approved = level1Approved;
    if (level2Approved !== undefined) updateData.level2Approved = level2Approved;
    if (level1ApprovedBy !== undefined) updateData.level1ApprovedBy = level1ApprovedBy;
    if (level1ApprovedDate !== undefined) updateData.level1ApprovedDate = level1ApprovedDate;
    if (level2ApprovedBy !== undefined) updateData.level2ApprovedBy = level2ApprovedBy;
    if (level2ApprovedDate !== undefined) updateData.level2ApprovedDate = level2ApprovedDate;

    await po.update(updateData);
    
    await PurchaseOrderDetail.destroy({ where: { purchaseOrderId: po.id } });
    if (computedDetails && computedDetails.length > 0) {
      const detailsToCreate = computedDetails.map(d => {
        const { id, _id, ...rest } = d;
        return { ...rest, purchaseOrderId: po.id };
      });
      await PurchaseOrderDetail.bulkCreate(detailsToCreate);
    }


     const newIndentDetailIds = computedDetails.map(d => d.indentDetailId).filter(Boolean);
    const allAffected = [...new Set([...oldIndentDetailIds, ...newIndentDetailIds])];
    for (const id of allAffected) {
      await updateIndentBalance(id);
    }
    
    const updatedPo = await PurchaseOrder.findByPk(req.params.id, { include: ["details"] });
    res.json(updatedPo);
  } catch (err) {
    console.error("Update PO error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders/pending-level1 ─────────────────────────────────
exports.getPendingLevel1 = async (req, res) => {
  try {
    const pendingPOs = await PurchaseOrder.findAll({
      where: {
        level1Approved: "No",
        status: { [Op.ne]: "Closed" }
      },
      include: ["details"],
      order: [["createdAt", "DESC"]],
    });
    res.json(pendingPOs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/purchase-orders/pending-level2 ─────────────────────────────────
exports.getPendingLevel2 = async (req, res) => {
  try {
    const pendingPOs = await PurchaseOrder.findAll({
      where: {
        level1Approved: "Yes",
        level2Approved: "No",
        status: { [Op.ne]: "Closed" }
      },
      include: ["details"],
      order: [["createdAt", "DESC"]],
    });
    res.json(pendingPOs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/purchase-orders/:id/approve-level1 ─────────────────────────────
exports.approveLevel1 = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: "PO not found" });
    
    await po.update({
      level1Approved: "Yes",
      level1ApprovedBy: req.body.approvedBy || "System",
      level1ApprovedDate: new Date()
    });
    
    const updatedPo = await PurchaseOrder.findByPk(req.params.id, { include: ["details"] });
    res.json(updatedPo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PUT /api/purchase-orders/:id/approve-level2 ─────────────────────────────
exports.approveLevel2 = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: "PO not found" });
    
    await po.update({
      level2Approved: "Yes",
      level2ApprovedBy: req.body.approvedBy || "System",
      level2ApprovedDate: new Date(),
      status: "Approved" // Optional: Update status when fully approved
    });
    
    const updatedPo = await PurchaseOrder.findByPk(req.params.id, { include: ["details"] });
    res.json(updatedPo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/purchase-orders/:id ─────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ message: "PO not found" });

    const oldDetails = await PurchaseOrderDetail.findAll({ where: { purchaseOrderId: po.id } });
    const oldIndentDetailIds = oldDetails.map(d => d.indentDetailId).filter(Boolean);

    await po.destroy();

    for (const id of oldIndentDetailIds) {
      await updateIndentBalance(id);
    }

    res.json({ message: "Deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};  