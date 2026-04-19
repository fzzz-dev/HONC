const Uom = require("../model/Uom");

// GET /api/uoms
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (active !== undefined) filter.active = active === "true";

    const uoms = await Uom.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: uoms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/uoms/:id
exports.getOne = async (req, res) => {
  try {
    const uom = await Uom.findById(req.params.id);
    if (!uom)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: uom });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/uoms
exports.create = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    const exists = await Uom.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "UOM name already exists" });
    }

    const uom = await Uom.create({
      name: name.trim(),
      description: description?.trim() || "",
      active,
    });
    res.status(201).json({ success: true, data: uom });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/uoms/:id
exports.update = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    const duplicate = await Uom.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "UOM name already exists" });
    }

    const uom = await Uom.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description: description?.trim() || "", active },
      { new: true, runValidators: true },
    );
    if (!uom)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: uom });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/uoms/:id
exports.remove = async (req, res) => {
  try {
    const uom = await Uom.findById(req.params.id);
    if (!uom)
      return res.status(404).json({ success: false, message: "Not found" });
    await uom.deleteOne();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
