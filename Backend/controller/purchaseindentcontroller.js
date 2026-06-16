const PurchaseIndent = require("../model/purchaseIndent");
const PurchaseIndentDetail = require("../model/purchaseIndentDetail");
const { Op } = require("sequelize");

const TODAY = () => new Date().toISOString().split("T")[0];

// ── Helper: Calculate and update indent status based on PO consumption ─────────
async function calculateAndUpdateIndentStatus(indentId) {
  const indent = await PurchaseIndent.findByPk(indentId, {
    include: ["details"]
  });
  
  if (!indent) return null;
  
  const details = indent.details || [];
  if (details.length === 0) {
    if (indent.status !== 'Open') {
      await indent.update({ status: 'Open' });
    }
    return 'Open';
  }
  
  let totalItems = 0;
  let fullyOrdered = 0;
  let partiallyOrdered = 0;
  
  for (const detail of details) {
    const indentQty = Number(detail.indentQty || 0);
    const alPoQty = Number(detail.alPoQty || 0);
    const balQty = Number(detail.balQty !== undefined ? detail.balQty : indentQty - alPoQty);
    
    if (indentQty > 0) {
      totalItems++;
      
      if (balQty <= 0) {
        fullyOrdered++;
      } else if (alPoQty > 0 && balQty < indentQty) {
        partiallyOrdered++;
      }
    }
  }
  
  let newStatus = indent.status;
  if (fullyOrdered === totalItems && totalItems > 0) {
    newStatus = 'Closed';
  } else if (partiallyOrdered > 0 || (fullyOrdered > 0 && fullyOrdered < totalItems)) {
    newStatus = 'Partial';
  } else {
    newStatus = 'Open';
  }
  
  if (newStatus !== indent.status) {
    await indent.update({ status: newStatus });
  }
  
  return newStatus;
}

// ── Sanitize one detail row ───────────────────────────────────────────────────
function sanitizeDetail(d = {}) {
  const indentQty = Math.max(0, Number(d.indentQty) || 0);
  const alPoQty   = Math.max(0, Number(d.alPoQty)   || 0);

  // If balQty is explicitly provided (editing an existing row), use it.
  // Otherwise (new row), default balQty = indentQty so it appears in Pick Pending.
  let balQty;
  if (d.balQty !== undefined && d.balQty !== null && d.balQty !== "") {
    balQty = Math.max(0, Number(d.balQty));
  } else {
    balQty = Math.max(0, indentQty - alPoQty);
  }

  return {
    inventoryHeadId:   d.headId || d.inventoryHeadId || null,
    inventoryHeadName: String(d.headName || d.inventoryHeadName || ""),
    mainCategoryId:    d.mainCategoryId || null,
    mainCategoryName:  String(d.mainCategoryName || ""),
    itemId:   d.itemId || null,
    itemName: String(d.itemName || ""),
    itemDescription: String(d.itemDescription || d.itemName || ""),
    uom:      String(d.uom || ""),
    indentQty,
    dueDate:  String(d.dueDate || ""),
    remarks:  String(d.remarks || ""),
    alPoQty,
    balQty,
  };
}

// ── Sanitize the full request body ───────────────────────────────────────────
function sanitizeBody(body = {}) {
  const details = Array.isArray(body.details) ? body.details : [];
  
  return {
    indentNo: String(body.indentNo || "").trim(),
    date: String(body.indentDate || body.date || TODAY()),
    departmentId: body.departmentId || null,
    departmentName: String(body.departmentName || ""),
    createdBy: String(body.createdBy || body.preparedBy || "Admin"),
    createdOn: String(body.createdOn || TODAY()),
    // Don't trust incoming status - will be recalculated
    remarks: String(body.remarks || ""),
    details: details.map(sanitizeDetail),
    totalQty: details.reduce((sum, d) => sum + (Number(d.indentQty) || 0), 0),
    totalItems: details.length,
  };
}

function getFinancialYear() {
  const today = new Date();
  const month = today.getMonth() + 1; // 1-12
  const year = today.getFullYear();
  if (month < 4) {
    return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
  }
  return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
}

// ── Generate next indent number ───────────────────────────────────────────────
async function generateIndentNo() {
  const fy = getFinancialYear();
  const prefix = "IND/";
  // Search for any record with the current financial year at the end
  const last = await PurchaseIndent.findOne({
    where: {
      indentNo: { [Op.like]: `${prefix}%/${fy}` }
    },
    order: [["indentNo", "DESC"]]
  });

  let next = 1;
  if (last) {
    // Expected format: IND/0001/2026-2027
    const parts = last.indentNo.split("/");
    if (parts.length === 3) {
      next = parseInt(parts[1], 10) + 1;
    }
  }
  return `${prefix}${String(next).padStart(4, "0")}/${fy}`;
}

// ── GET all ───────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { status, departmentId, search, forPicking } = req.query;
    const where = {};
    
    // ✅ If this is for the PO picking modal, include both Open AND Partial
    if (forPicking === 'true') {
      where.status = { [Op.in]: ['Open', 'Partial'] };
    } else if (status) {
      where.status = status;
    }
    
    if (departmentId) where.departmentId = departmentId;
    if (search) where.indentNo = { [Op.like]: `%${search}%` };

    const indents = await PurchaseIndent.findAll({
      where,
      include: ["details"],
      order: [["createdAt", "DESC"]],
    });
    
    // Transform response
    const transformedIndents = indents.map(indent => {
      const indentData = indent.toJSON();
      return {
        ...indentData,
        indentDate: indentData.date,
        preparedBy: indentData.createdBy,
        details: (indentData.details || []).map(detail => ({
          ...detail,
          headId: detail.inventoryHeadId,
          headName: detail.inventoryHeadName,
        }))
      };
    });
    
    res.json({ success: true, data: transformedIndents });
  } catch (err) {

    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET next number ───────────────────────────────────────────────────────────
exports.getNextNumber = async (req, res) => {
  try {
    const indentNo = await generateIndentNo();
    res.json({ success: true, indentNo });
  } catch (err) {

    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET one ───────────────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const indent = await PurchaseIndent.findByPk(req.params.id, {
      include: ["details"]
    });
    if (!indent)
      return res.status(404).json({ success: false, message: "Indent not found" });
    
    // Ensure status is calculated
    const calculatedStatus = await calculateAndUpdateIndentStatus(indent.id);
    
    // Transform response to match frontend expectations
    const indentData = indent.toJSON();
    const transformedIndent = {
      ...indentData,
      indentDate: indentData.date,
      preparedBy: indentData.createdBy,
      status: calculatedStatus || indentData.status,
      details: (indentData.details || []).map(detail => ({
        ...detail,
        headId: detail.inventoryHeadId,
        headName: detail.inventoryHeadName,
      }))
    };
    
    res.json({ success: true, data: transformedIndent });
  } catch (err) {

    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const body = sanitizeBody(req.body);
    if (!body.indentNo) body.indentNo = await generateIndentNo();
    if (!body.departmentId)
      return res.status(400).json({ success: false, message: "Department is required" });

    // Start with Open status - will be recalculated
    const createData = {
      ...body,
      status: "Open"
    };
    
    const indent = await PurchaseIndent.create(createData, { include: ["details"] });
    
    // Calculate and update the actual status based on PO data (if any alPoQty exists)
    const calculatedStatus = await calculateAndUpdateIndentStatus(indent.id);
    
    // Fetch fresh data with updated status
    const updatedIndent = await PurchaseIndent.findByPk(indent.id, { include: ["details"] });
    
    const indentData = updatedIndent.toJSON();
    const transformedIndent = {
      ...indentData,
      indentDate: indentData.date,
      preparedBy: indentData.createdBy,
      status: calculatedStatus || indentData.status,
      details: (indentData.details || []).map(detail => ({
        ...detail,
        headId: detail.inventoryHeadId,
        headName: detail.inventoryHeadName,
      }))
    };
    
    res.status(201).json({ success: true, data: transformedIndent });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError')
      return res.status(400).json({ success: false, message: "Indent number already exists" });

    res.status(400).json({ success: false, message: err.message });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const indent = await PurchaseIndent.findByPk(req.params.id);
    if (!indent)
      return res.status(404).json({ success: false, message: "Indent not found" });

    const body = sanitizeBody(req.body);
    
    // Don't update status from request - will recalculate
    const { status, ...updateData } = body;
    
    // Update header
    await indent.update(updateData);
    
    // Replace details
    await PurchaseIndentDetail.destroy({ where: { purchaseIndentId: indent.id } });
    if (body.details && body.details.length > 0) {
      const detailsToCreate = body.details.map(d => {
        const { id, ...rest } = d;
        return { ...rest, purchaseIndentId: indent.id };
      });
      await PurchaseIndentDetail.bulkCreate(detailsToCreate);
    }
    
    // Recalculate status after update
    const calculatedStatus = await calculateAndUpdateIndentStatus(indent.id);

    const updatedIndent = await PurchaseIndent.findByPk(req.params.id, { include: ["details"] });
    
    const indentData = updatedIndent.toJSON();
    const transformedIndent = {
      ...indentData,
      indentDate: indentData.date,
      preparedBy: indentData.createdBy,
      status: calculatedStatus || indentData.status,
      details: (indentData.details || []).map(detail => ({
        ...detail,
        headId: detail.inventoryHeadId,
        headName: detail.inventoryHeadName,
      }))
    };
    
    res.json({ success: true, data: transformedIndent });
  } catch (err) {

    res.status(400).json({ success: false, message: err.message });
  }
};

// Update indent detail balance after PO is created
exports.updateIndentBalance = async (req, res) => {
  try {
    const { indentDetailId } = req.params;
    const { poQty } = req.body;
    
    // Get the indent detail
    const indentDetail = await PurchaseIndentDetail.findByPk(indentDetailId);
    if (!indentDetail) {
      return res.status(404).json({ success: false, message: "Indent detail not found" });
    }
    
    // Update alPoQty and balQty
    const newAlPoQty = (indentDetail.alPoQty || 0) + Number(poQty);
    const newBalQty = indentDetail.indentQty - newAlPoQty;
    
    await indentDetail.update({
      alPoQty: newAlPoQty,
      balQty: newBalQty > 0 ? newBalQty : 0
    });
    
    // Check if all items in this indent are now fully ordered
    const parentIndent = await PurchaseIndent.findByPk(indentDetail.purchaseIndentId, {
      include: ["details"]
    });
    
    // Calculate if all details have balQty <= 0
    const allFullyOrdered = parentIndent.details.every(d => (d.balQty || 0) <= 0);
    
    if (allFullyOrdered) {
      await parentIndent.update({ status: "Closed" });
    } else {
      // Check if any item has been ordered (Partial status)
      const hasAnyOrdered = parentIndent.details.some(d => (d.alPoQty || 0) > 0);
      if (hasAnyOrdered && parentIndent.status !== "Partial") {
        await parentIndent.update({ status: "Partial" });
      }
    }
    
    res.json({ success: true, message: "Indent balance updated" });
  } catch (err) {

    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const indent = await PurchaseIndent.findByPk(req.params.id);
    if (!indent)
      return res.status(404).json({ success: false, message: "Indent not found" });
    await indent.destroy();
    res.json({ success: true, message: "Indent deleted successfully" });
  } catch (err) {

    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE indent detail PO quantities (called from PO controller) ───────────
exports.updateIndentDetailPOQuantities = async (indentDetailId, totalPoQty) => {
  try {
    // Update the indent detail with the total PO quantity ordered
    await PurchaseIndentDetail.update(
      { alPoQty: totalPoQty || 0 },
      { where: { id: indentDetailId } }
    );
    
    // Get the indent detail to find its parent indent
    const indentDetail = await PurchaseIndentDetail.findByPk(indentDetailId);
    if (indentDetail && indentDetail.purchaseIndentId) {
      // Recalculate the parent indent's status
      await calculateAndUpdateIndentStatus(indentDetail.purchaseIndentId);
    }
    
    return true;
  } catch (err) {

    return false;
  }
};

// ── Bulk update indent statuses (can be called via cron or manually) ─────────
exports.recalculateAllIndentStatuses = async (req, res) => {
  try {
    const indents = await PurchaseIndent.findAll({
      include: ["details"]
    });
    
    const results = [];
    for (const indent of indents) {
      const newStatus = await calculateAndUpdateIndentStatus(indent.id);
      results.push({
        indentNo: indent.indentNo,
        oldStatus: indent.status,
        newStatus: newStatus || indent.status
      });
    }
    
    res.json({
      success: true,
      message: `Recalculated status for ${results.length} indents`,
      data: results
    });
  } catch (err) {

    res.status(500).json({ success: false, message: err.message });
  }
};