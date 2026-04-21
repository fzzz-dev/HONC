const mongoose = require("mongoose");
const PurchaseIndent = require("../model/purchaseIndent");

const TODAY = () => new Date().toISOString().split("T")[0];

// ── Safe ObjectId: undefined (not null) when blank so Mongoose skips cast ────
function toOid(val) {
  if (!val || String(val).trim() === "") return undefined;
  return mongoose.Types.ObjectId.isValid(val)
    ? new mongoose.Types.ObjectId(String(val))
    : undefined;
}

// ── Sanitize one detail row ───────────────────────────────────────────────────
function sanitizeDetail(d = {}) {
  const row = {
    inventoryHeadName: String(d.inventoryHeadName || ""),
    mainCategoryName: String(d.mainCategoryName || ""),
    itemName: String(d.itemName || ""),
    uom: String(d.uom || ""),
    indentQty: Math.max(0, Number(d.indentQty) || 0),
    dueDate: String(d.dueDate || ""),
    remarks: String(d.remarks || ""),
    alPoQty: Math.max(0, Number(d.alPoQty) || 0),
    balQty: Math.max(0, Number(d.balQty) || 0),
  };

  // Only include ObjectId fields when they have a valid value
  // (omitting them avoids CastError on empty strings)
  const headId = toOid(d.inventoryHeadId);
  const catId = toOid(d.mainCategoryId);
  const itemId = toOid(d.itemId);
  if (headId) row.inventoryHeadId = headId;
  if (catId) row.mainCategoryId = catId;
  if (itemId) row.itemId = itemId;

  return row;
}

// ── Sanitize the full request body ───────────────────────────────────────────
function sanitizeBody(body = {}) {
  const out = {
    indentNo: String(body.indentNo || "").trim(),
    date: String(body.date || TODAY()),
    departmentName: String(body.departmentName || ""),
    createdBy: String(body.createdBy || "Admin"),
    createdOn: String(body.createdOn || TODAY()),
    status: ["Open", "Closed", "Cancelled"].includes(body.status)
      ? body.status
      : "Open",
    remarks: String(body.remarks || ""),
    details: Array.isArray(body.details)
      ? body.details.map(sanitizeDetail)
      : [],
  };

  // Only attach departmentId when valid
  const deptId = toOid(body.departmentId);
  if (deptId) out.departmentId = deptId;

  // Guarantee date is never empty (schema has required:true)
  if (!out.date) out.date = TODAY();

  return out;
}

// ── Generate next indent number ───────────────────────────────────────────────
async function generateIndentNo() {
  const year = new Date().getFullYear();
  const prefix = `IND-${year}-`;
  const last = await PurchaseIndent.findOne(
    { indentNo: { $regex: `^IND-${year}-\\d+$` } },
    { indentNo: 1 },
    { sort: { indentNo: -1 } },
  );
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
    const filter = {};
    if (status) filter.status = status;
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId))
      filter.departmentId = departmentId;
    if (search) filter.indentNo = { $regex: search, $options: "i" };

    const indents = await PurchaseIndent.find(filter).sort({ createdAt: -1 });
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
    const indent = await PurchaseIndent.findById(req.params.id);
    if (!indent)
      return res
        .status(404)
        .json({ success: false, message: "Indent not found" });
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
      return res
        .status(400)
        .json({ success: false, message: "Department is required" });

    const indent = await PurchaseIndent.create(body);
    res.status(201).json({ success: true, data: indent });
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(400)
        .json({ success: false, message: "Indent number already exists" });
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ success: false, message: msg });
    }
    // Log full error server-side so you can see it in nodemon output
    console.error("❌ create indent error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const body = sanitizeBody(req.body);
    const indent = await PurchaseIndent.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!indent)
      return res
        .status(404)
        .json({ success: false, message: "Indent not found" });
    res.json({ success: true, data: indent });
  } catch (err) {
    if (err.name === "ValidationError") {
      const msg = Object.values(err.errors)
        .map((e) => e.message)
        .join(", ");
      return res.status(400).json({ success: false, message: msg });
    }
    console.error("❌ update indent error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const indent = await PurchaseIndent.findByIdAndDelete(req.params.id);
    if (!indent)
      return res
        .status(404)
        .json({ success: false, message: "Indent not found" });
    res.json({ success: true, message: "Indent deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
