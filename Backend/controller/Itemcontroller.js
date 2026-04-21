const Item = require("../model/item");
const path = require("path");
const fs = require("fs");
const multer = require("multer");

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

// ── GET all items ─────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { headId, group, search } = req.query;
    const filter = {};

    if (headId) filter.headId = headId;
    if (group) filter.group = group;
    if (search) {
      filter.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { make: { $regex: search, $options: "i" } },
        { spec: { $regex: search, $options: "i" } },
      ];
    }

    const items = await Item.find(filter).sort({ createdAt: -1 });

    // Attach full image URL if image is a filename (not base64)
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const itemsWithImageUrl = items.map((item) => {
      const obj = item.toObject();
      if (obj.image && !obj.image.startsWith("data:")) {
        obj.image = `${baseUrl}/uploads/items/${obj.image}`;
      }
      return obj;
    });

    res.json({ success: true, data: itemsWithImageUrl });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single item ───────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const obj = item.toObject();
    if (obj.image && !obj.image.startsWith("data:")) {
      obj.image = `${baseUrl}/uploads/items/${obj.image}`;
    }

    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE item ───────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const payload = { ...req.body };

    // If a file was uploaded via multipart, store just the filename
    if (req.file) {
      payload.image = req.file.filename;
    }

    const item = await Item.create(payload);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const obj = item.toObject();
    if (obj.image && !obj.image.startsWith("data:")) {
      obj.image = `${baseUrl}/uploads/items/${obj.image}`;
    }

    res.status(201).json({ success: true, data: obj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── UPDATE item ───────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const payload = { ...req.body };

    // If a new file was uploaded, delete old image and store new filename
    if (req.file) {
      const existing = await Item.findById(req.params.id);
      if (existing && existing.image && !existing.image.startsWith("data:")) {
        const oldPath = path.join(
          __dirname,
          "../uploads/items",
          existing.image,
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      payload.image = req.file.filename;
    }

    // If image is explicitly set to null/empty string, remove old file too
    if (payload.image === null || payload.image === "") {
      const existing = await Item.findById(req.params.id);
      if (existing && existing.image && !existing.image.startsWith("data:")) {
        const oldPath = path.join(
          __dirname,
          "../uploads/items",
          existing.image,
        );
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      payload.image = null;
    }

    const item = await Item.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const obj = item.toObject();
    if (obj.image && !obj.image.startsWith("data:")) {
      obj.image = `${baseUrl}/uploads/items/${obj.image}`;
    }

    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE item ───────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const item = await Item.findByIdAndDelete(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    // Delete image from disk if it exists
    if (item.image && !item.image.startsWith("data:")) {
      const imgPath = path.join(__dirname, "../uploads/items", item.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    res.json({ success: true, message: "Item deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.upload = upload;
