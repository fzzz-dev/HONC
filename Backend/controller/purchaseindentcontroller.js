const PurchaseIndent = require("../model/purchaseIndent");
const PurchaseIndentDetail = require("../model/purchaseIndentDetail");
const { Op } = require("sequelize");

const TODAY = () => new Date().toISOString().split("T")[0];

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
    // Map frontend headId/inventoryHeadId to backend field
    inventoryHeadId:   d.headId || d.inventoryHeadId || null,
    inventoryHeadName: String(d.headName || d.inventoryHeadName || ""),
    // Map frontend category fields
    mainCategoryId:    d.mainCategoryId || null,
    mainCategoryName:  String(d.mainCategoryName || ""),
    // Map item fields
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
    status: ["Open", "Closed", "Cancelled"].includes(body.status) ? body.status : "Open",
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
    const { status, departmentId, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (search) where.indentNo = { [Op.like]: `%${search}%` };

    const indents = await PurchaseIndent.findAll({
      where,
      include: ["details"],
      order: [["createdAt", "DESC"]],
    });
    
    // Transform response to match frontend expectations
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
    
    // Transform response to match frontend expectations
    const indentData = indent.toJSON();
    const transformedIndent = {
      ...indentData,
      indentDate: indentData.date,
      preparedBy: indentData.createdBy,
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

    const indent = await PurchaseIndent.create(body, { include: ["details"] });
    
    // Transform response
    const indentData = indent.toJSON();
    const transformedIndent = {
      ...indentData,
      indentDate: indentData.date,
      preparedBy: indentData.createdBy,
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
    console.error("❌ create indent error:", err);
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
    
    // Update header
    await indent.update(body);
    
    // Replace details
    await PurchaseIndentDetail.destroy({ where: { purchaseIndentId: indent.id } });
    if (body.details && body.details.length > 0) {
      const detailsToCreate = body.details.map(d => {
        const { id, ...rest } = d;
        return { ...rest, purchaseIndentId: indent.id };
      });
      await PurchaseIndentDetail.bulkCreate(detailsToCreate);
    }

    const updatedIndent = await PurchaseIndent.findByPk(req.params.id, { include: ["details"] });
    
    // Transform response
    const indentData = updatedIndent.toJSON();
    const transformedIndent = {
      ...indentData,
      indentDate: indentData.date,
      preparedBy: indentData.createdBy,
      details: (indentData.details || []).map(detail => ({
        ...detail,
        headId: detail.inventoryHeadId,
        headName: detail.inventoryHeadName,
      }))
    };
    
    res.json({ success: true, data: transformedIndent });
  } catch (err) {
    console.error("❌ update indent error:", err);
    res.status(400).json({ success: false, message: err.message });
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