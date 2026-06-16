const Item = require("../model/item");
const InventoryHead = require("../model/inventoryHead");
const MainCategory = require("../model/mainCategory");
const Uom = require("../model/uom");
const Make = require("../model/make");
const Spec = require("../model/spec");
const sequelize = require("../config/database");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const XLSX = require("xlsx");
const { Op } = require("sequelize");

/** Excel column aliases for inventory head *name* (when headId missing or invalid). */
const HEAD_NAME_ALIASES = [
  "head",
  "headName",
  "inventoryHead",
  "Head",
  "inventory head",
  "Inventory Head",
  "InventoryHead",
  "invHead",
  "Inv Head",
  "HEAD",
  "category",
  "Category",
  "head_name",
  "category_name",
  "Item Head",
];

// ── Multer disk storage config ────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/items");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `item_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const bulkUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") cb(null, true);
    else cb(new Error("Only .xlsx or .xls files are allowed"), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function toBoolean(value) {
  if (value === undefined) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n"].includes(normalized)) return false;
    return normalized === "true";
  }
  return Boolean(value);
}

function normalizeMovementType(value) {
  if (value === undefined || value === null) return value;
  const normalized = String(value).trim().toLowerCase().replace(/_/g, "-");
  if (normalized === "non moving" || normalized === "non-moving") {
    return "non-moving";
  }
  if (normalized === "moving") return "moving";
  return value;
}

function computeItemDescription(itemName, spec, make) {
  const n = String(itemName || "").trim();
  const s = String(spec || "").trim();
  const m = String(make || "").trim();
  return [n, s, m].filter(Boolean).join(" ");
}

async function assertUniqueItemDescription(description, excludeId) {
  const trimmed = String(description || "").trim();
  const value = trimmed || null;
  if (value === null) return;
  const where = { itemDescription: value };
  if (excludeId != null) {
    where.id = { [Op.ne]: excludeId };
  }
  const exists = await Item.findOne({ where });
  if (exists) {
    const err = new Error(
      "This item description already exists. Item descriptions must be unique.",
    );
    err.code = "DUPLICATE_ITEM_DESCRIPTION";
    throw err;
  }
}

function getStoredImageName(imageValue) {
  if (!imageValue || typeof imageValue !== "string" || imageValue.startsWith("data:")) {
    return imageValue;
  }

  const uploadsMarker = "/uploads/items/";
  const uploadsIndex = imageValue.lastIndexOf(uploadsMarker);
  if (uploadsIndex !== -1) {
    return decodeURIComponent(
      imageValue.slice(uploadsIndex + uploadsMarker.length),
    );
  }

  if (/^https?:\/\//i.test(imageValue)) {
    try {
      return decodeURIComponent(path.basename(new URL(imageValue).pathname));
    } catch (error) {
      return path.basename(imageValue);
    }
  }

  return path.basename(imageValue);
}

function removeStoredImage(imageValue) {
  const fileName = getStoredImageName(imageValue);
  if (!fileName || typeof fileName !== "string" || fileName.startsWith("data:")) {
    return;
  }

  const filePath = path.join(__dirname, "../uploads/items", fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function rowValuePresent(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === "number") return !Number.isNaN(val);
  return String(val).trim() !== "";
}

/** Read first matching column from Excel row (case- / space-insensitive header). */
function rowField(row, aliases) {
  const r = row || {};
  const keys = Object.keys(r);
  const norm = (k) => String(k).replace(/\s+/g, "").toLowerCase();

  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(r, alias)) {
      const v = r[alias];
      if (rowValuePresent(v)) return v;
    }
    const matchKey = keys.find((k) => norm(k) === norm(alias));
    if (matchKey != null) {
      const v = r[matchKey];
      if (rowValuePresent(v)) return v;
    }
  }
  return "";
}

function rowFieldStrict(row, aliases) {
  const v = rowField(row, aliases);
  return v ? String(v).trim() : "";
}

async function resolveInventoryHeadForBulk(row) {
  const idPart = rowField(row, ["headId", "head_id", "Head ID", "HeadId"]);
  const namePart = rowField(row, HEAD_NAME_ALIASES);

  if (rowValuePresent(idPart)) {
    const num = Number(String(idPart).trim());
    if (!Number.isNaN(num) && num > 0) {
      const byId = await InventoryHead.findByPk(num);
      if (byId) return byId;
    }
  }

  const name = String(namePart || "").trim();
  if (name) {
    const byName = await InventoryHead.findOne({
      where: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("headName")),
        name.toLowerCase(),
      ),
    });
    if (byName) return byName;
    return InventoryHead.create({
      headName: name,
      active: true,
    });
  }

  return null;
}

async function ensureMainCategoryRow(headId, headName, groupRaw) {
  const g = String(groupRaw || "").trim();
  if (!g) return;

  const existing = await MainCategory.findOne({
    where: {
      [Op.and]: [
        { headId },
        sequelize.where(
          sequelize.fn("LOWER", sequelize.col("groupName")),
          g.toLowerCase(),
        ),
      ],
    },
  });
  if (existing) return;

  await MainCategory.create({
    headId,
    headName,
    groupName: g,
    active: true,
  });
}

async function ensureMasterName(Model, value, extraDefaults = {}) {
  const n = String(value || "").trim();
  if (!n) return;

  const existing = await Model.findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("name")),
      n.toLowerCase(),
    ),
  });
  if (existing) return;

  try {
    await Model.create({ name: n, active: true, ...extraDefaults });
  } catch (err) {
    if (err.name !== "SequelizeUniqueConstraintError") throw err;
  }
}

function normalizePayload(body) {
  const payload = { ...body };

  if (payload.headId !== undefined && payload.headId !== "") {
    payload.headId = Number(payload.headId);
  }

  if (payload.active !== undefined) {
    payload.active = toBoolean(payload.active);
  }

  [
    "head",
    "group",
    "itemName",
    "uom",
    "make",
    "spec",
    "movementType",
    "hsnCode",
    "rackBinNo",
  ].forEach((field) => {
    if (typeof payload[field] === "string") {
      payload[field] = payload[field].trim();
    }
  });

  if (payload.movementType !== undefined) {
    payload.movementType = normalizeMovementType(payload.movementType);
  }

  payload.itemDescription = computeItemDescription(
    payload.itemName,
    payload.spec,
    payload.make,
  );

  const numFields = [
    "minimumStock",
    "minimumOrderQty",
    "leadDays",
    "inTransitDays",
    "gstPercent",
    "rate",
  ];
  numFields.forEach((f) => {
    if (payload[f] === undefined || payload[f] === "") return;
    const n = Number(payload[f]);
    payload[f] = Number.isFinite(n) ? n : 0;
  });

  if (payload.image !== undefined && payload.image !== null && payload.image !== "") {
    payload.image = getStoredImageName(payload.image);
  }

  return payload;
}

function serializeItem(item, req) {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const obj = item.get({ plain: true });

  if (
    obj.image &&
    typeof obj.image === "string" &&
    !obj.image.startsWith("data:") &&
    !/^https?:\/\//i.test(obj.image)
  ) {
    if (obj.image.startsWith("/uploads/items/")) {
      obj.image = `${baseUrl}${obj.image}`;
    } else {
      obj.image = `${baseUrl}/uploads/items/${obj.image}`;
    }
  }

  return obj;
}

// ── GET all items ─────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { headId, group, search } = req.query;
    const where = {};

    if (headId) where.headId = headId;
    if (group) where.group = group;
    if (search) {
      where[Op.or] = [
        { itemName: { [Op.like]: `%${search}%` } },
        { make: { [Op.like]: `%${search}%` } },
        { spec: { [Op.like]: `%${search}%` } },
      ];
    }

    const items = await Item.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    res.json({ success: true, data: items.map((item) => serializeItem(item, req)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single item ───────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    res.json({ success: true, data: serializeItem(item, req) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE item ───────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    if (req.file) {
      payload.image = req.file.filename;
    }

    await assertUniqueItemDescription(payload.itemDescription, null);

    const item = await Item.create(payload);

    res.status(201).json({ success: true, data: serializeItem(item, req) });
  } catch (err) {
    if (err.code === "DUPLICATE_ITEM_DESCRIPTION") {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message:
          "This item description already exists. Item descriptions must be unique.",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── UPDATE item ───────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    const payload = normalizePayload(req.body);

    if (req.file) {
      removeStoredImage(item.image);
      payload.image = req.file.filename;
    }

    if (payload.image === null || payload.image === "") {
      removeStoredImage(item.image);
      payload.image = null;
    }

    await assertUniqueItemDescription(payload.itemDescription, item.id);

    await item.update(payload);

    res.json({ success: true, data: serializeItem(item, req) });
  } catch (err) {
    if (err.code === "DUPLICATE_ITEM_DESCRIPTION") {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        success: false,
        message:
          "This item description already exists. Item descriptions must be unique.",
      });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE item ───────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    removeStoredImage(item.image);

    await item.destroy();
    res.json({ success: true, message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.upload = upload;
exports.bulkUploadMiddleware = bulkUpload;

exports.downloadTemplate = async (req, res) => {
  try {
    const headers = [
      "headId",
      "head",
      "category",
      "itemName",
      "uom",
      "make",
      "spec",
      "rate",
      "active",
      "movementType",
      "minimumStock",
      "minimumOrderQty",
      "leadDays",
      "inTransitDays",
      "hsnCode",
      "gstPercent",
      "gstType",
      "rackBinNo",
    ];

    const sampleRow = {
      headId: 1,
      head: "Raw Material",
      category: "Steel",
      itemName: "MS Flat Bar 50x6",
      uom: "KG",
      make: "TATA",
      spec: "IS 2062",
      rate: 100.5,
      active: "true",
      movementType: "moving",
      minimumStock: 0,
      minimumOrderQty: 1,
      leadDays: 7,
      inTransitDays: 3,
      hsnCode: "",
      gstPercent: 18,
      gstType: "local",
      rackBinNo: "",
    };

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ItemsTemplate");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="item-bulk-template.xlsx"',
    );
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulkUpload = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ success: false, message: "Excel file is required" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res
        .status(400)
        .json({ success: false, message: "Excel sheet not found" });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
      blankrows: false,
    });

    if (!rows.length) {
      return res
        .status(400)
        .json({ success: false, message: "No data rows found in file" });
    }

    const errors = [];
    const validRows = [];

    for (let idx = 0; idx < rows.length; idx += 1) {
      const row = rows[idx];
      const rowNumber = idx + 2;

      const isRowEmpty = Object.values(row).every(
        (v) =>
          v === undefined ||
          v === null ||
          (typeof v === "number" && Number.isNaN(v)) ||
          String(v).trim() === "",
      );
      if (isRowEmpty) continue;

      const groupFromFile = rowField(row, [
        "category",
        "categoryName",
        "group",
        "groupName",
        "mainCategory",
      ]);

      const payload = normalizePayload({
        headId: rowField(row, ["headId", "head_id"]),
        head: rowField(row, HEAD_NAME_ALIASES) || "General",
        group: groupFromFile || "General",
        itemName: rowField(row, ["itemName", "item", "Item Name", "Item", "item_name", "item name", "Description", "description", "Item Description"]),
        uom: rowField(row, ["uom", "UOM", "unit", "Uom", "Unit"]) || "General",
        make: rowField(row, ["make", "Make", "brand", "Brand", "Manufacturer"]) || "General",
        spec: rowField(row, ["spec", "Spec", "specification", "Specification", "Size"]) || "General",
        rate: rowField(row, ["rate", "Rate", "price", "Price", "Unit Rate"]),
        active: (() => {
          const a = rowField(row, ["active", "Active"]);
          if (!rowValuePresent(a)) return true;
          return a;
        })(),
        movementType: rowField(row, ["movementType", "movement", "Movement"]) || "moving",
        minimumStock: rowField(row, ["minimumStock", "minStock"]),
        minimumOrderQty: rowField(row, ["minimumOrderQty", "moq"]),
        leadDays: rowField(row, ["leadDays", "lead"]),
        inTransitDays: rowField(row, ["inTransitDays", "transitDays"]),
        hsnCode: rowField(row, ["hsnCode", "HSN", "hsn"]),
        gstPercent: rowField(row, ["gstPercent", "gst", "GST"]),
        gstType: rowField(row, ["gstType", "gst Type"]) || "local",
        rackBinNo: rowField(row, ["rackBinNo", "rack", "bin"]),
      });

      const headRecord = await resolveInventoryHeadForBulk(row);
      if (!headRecord) {
        errors.push({
          row: rowNumber,
          message:
            "Inventory head not found: provide headId (existing) or head name (new heads are created automatically)",
        });
        continue;
      }

      payload.headId = headRecord.id;
      payload.head = headRecord.headName;

      try {
        await ensureMainCategoryRow(
          headRecord.id,
          headRecord.headName,
          payload.group,
        );
        await ensureMasterName(Uom, payload.uom, { description: "" });
        await ensureMasterName(Make, payload.make, { description: "" });
        await ensureMasterName(Spec, payload.spec);
      } catch (ensureErr) {
        errors.push({
          row: rowNumber,
          message: ensureErr.message || "Failed to ensure category / masters",
        });
        continue;
      }

      if (!payload.itemName || !String(payload.itemName).trim()) {
        errors.push({ row: rowNumber, message: "itemName is required" });
        continue;
      }
      if (!["moving", "non-moving"].includes(payload.movementType)) {
        errors.push({
          row: rowNumber,
          message: 'movementType must be "moving" or "non-moving"',
        });
        continue;
      }

      const fileDup = validRows.some(
        (r) => r.itemDescription === payload.itemDescription,
      );
      if (fileDup) {
        errors.push({
          row: rowNumber,
          message: "Duplicate item description (also in this file)",
        });
        continue;
      }

      const dbDup = await Item.findOne({
        where: { itemDescription: payload.itemDescription },
      });
      if (dbDup) {
        errors.push({
          row: rowNumber,
          message: "Duplicate item description (already exists)",
        });
        continue;
      }

      validRows.push(payload);
    }

    if (!validRows.length) {
      return res.status(400).json({
        success: false,
        message: "No valid rows found",
        insertedCount: 0,
        failedCount: errors.length,
        errors,
      });
    }

    const createdItems = await Item.bulkCreate(validRows);

    return res.json({
      success: true,
      message: "Bulk upload completed",
      insertedCount: createdItems.length,
      failedCount: errors.length,
      errors,
      data: createdItems.map((item) => serializeItem(item, req)),
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
