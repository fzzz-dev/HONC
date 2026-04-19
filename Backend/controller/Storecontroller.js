const Store = require("../model/Store");

// GET /api/stores
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (active !== undefined) filter.active = active === "true";

    const stores = await Store.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/stores/:id
exports.getOne = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/stores
exports.create = async (req, res) => {
  try {
    const { name, location, active } = req.body;

    const exists = await Store.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Store name already exists" });
    }

    const store = await Store.create({
      name: name.trim(),
      location: location?.trim() || "",
      active,
    });
    res.status(201).json({ success: true, data: store });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/stores/:id
exports.update = async (req, res) => {
  try {
    const { name, location, active } = req.body;

    const duplicate = await Store.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Store name already exists" });
    }

    const store = await Store.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), location: location?.trim() || "", active },
      { new: true, runValidators: true }
    );
    if (!store)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: store });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/stores/:id
exports.remove = async (req, res) => {
  try {
    const store = await Store.findById(req.params.id);
    if (!store)
      return res.status(404).json({ success: false, message: "Not found" });
    await store.deleteOne();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};