const PurchaseIndent = require("../model/purchaseIndent");
const { Op } = require("sequelize");

const TODAY = () => new Date().toISOString().split("T")[0];

// ── Sanitize one detail row ───────────────────────────────────────────────────
function sanitizeDetail(d = {}) {
  return {
    inventoryHeadId: d.inventoryHeadId || null,
    inventoryHeadName: String(d.inventoryHeadName || ""),
    mainCategoryId: d.mainCategoryId || null,
    mainCategoryName: String(d.mainCategoryName || ""),
    itemId: d.itemId || null,
    itemName: String(d.itemName || ""),
    uom: String(d.uom || ""),
    indentQty: Math.max(0, Number(d.indentQty) || 0),
    dueDate: String(d.dueDate || ""),
    remarks: String(d.remarks || ""),
    alPoQty: Math.max(0, Number(d.alPoQty) || 0),
    balQty: Math.max(0, Number(d.balQty) || 0),
    id: d.id || Date.now() + Math.random(), // Ensure each detail has an ID
  };
}

// ── Sanitize the full request body ───────────────────────────────────────────
function sanitizeBody(body = {}) {
  return {
    indentNo: String(body.indentNo || "").trim(),
    date: String(body.date || TODAY()),
    departmentId: body.departmentId || null,
    departmentName: String(body.departmentName || ""),
    createdBy: String(body.createdBy || "Admin"),
    createdOn: String(body.createdOn || TODAY()),
    status: ["Open", "Closed", "Cancelled"].includes(body.status) ? body.status : "Open",
    remarks: String(body.remarks || ""),
    details: Array.isArray(body.details) ? body.details.map(sanitizeDetail) : [],
  };
}

// ── Generate next indent number ───────────────────────────────────────────────
async function generateIndentNo() {
  const year = new Date().getFullYear();
  const prefix = `IND-${year}-`;
  const last = await PurchaseIndent.findOne({
    where: {
      indentNo: { [Op.like]: `IND-${year}-%` }
    },
    order: [["indentNo", "DESC"]]
  });

  let next = 1;
  if (last) {
    const m = last.indentNo.match(/^IND-\d{4}-(\d+)$/);
    if (m) next = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(next).padStart(3, "0")}`;
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
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: indents });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET next number ───────────────────────────────────────────────────────────
exports.getNextNumber = async (req, res) => {
  try {
    res.json({ success: true, data: { indentNo: await generateIndentNo() } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET one ───────────────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const indent = await PurchaseIndent.findByPk(req.params.id);
    if (!indent)
      return res.status(404).json({ success: false, message: "Indent not found" });
    res.json({ success: true, data: indent });
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

    const indent = await PurchaseIndent.create(body);
    res.status(201).json({ success: true, data: indent });
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
    await indent.update(body);
    res.json({ success: true, data: indent });
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
