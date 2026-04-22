const Item = require("../model/item");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Op } = require("sequelize");

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

function toBoolean(value) {
  if (value === undefined) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
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

function normalizePayload(body) {
  const payload = { ...body };

  if (payload.headId !== undefined && payload.headId !== "") {
    payload.headId = Number(payload.headId);
  }

  if (payload.rate !== undefined && payload.rate !== "") {
    payload.rate = Number(payload.rate) || 0;
  }

  if (payload.active !== undefined) {
    payload.active = toBoolean(payload.active);
  }

  [
    "head",
    "group",
    "subCategory",
    "itemName",
    "uom",
    "make",
    "spec",
    "itemDescription",
  ].forEach((field) => {
    if (typeof payload[field] === "string") {
      payload[field] = payload[field].trim();
    }
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

    const item = await Item.create(payload);

    res.status(201).json({ success: true, data: serializeItem(item, req) });
  } catch (err) {
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

    await item.update(payload);

    res.json({ success: true, data: serializeItem(item, req) });
  } catch (err) {
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
