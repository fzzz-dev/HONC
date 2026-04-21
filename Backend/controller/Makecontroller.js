const Make = require("../model/Make");

// ── GET all makes ──────────────────────────────────────────────────────────
// GET /api/makes
// Query params: ?search=&active=true|false
exports.getAllMakes = async (req, res) => {
  try {
    const { search, active } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (active !== undefined) {
      filter.active = active === "true";
    }

    const makes = await Make.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: makes.length,
      data: makes,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single make by ID ──────────────────────────────────────────────────
// GET /api/makes/:id
exports.getMakeById = async (req, res) => {
  try {
    const make = await Make.findById(req.params.id);
    if (!make) {
      return res
        .status(404)
        .json({ success: false, message: "Make not found" });
    }
    res.status(200).json({ success: true, data: make });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE make ────────────────────────────────────────────────────────────
// POST /api/makes
exports.createMake = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    // Check duplicate name (case-insensitive)
    const existing = await Make.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Make "${name}" already exists`,
      });
    }

    const make = await Make.create({ name: name.trim(), description, active });

    res.status(201).json({ success: true, data: make });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Make name must be unique" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE make ────────────────────────────────────────────────────────────
// PUT /api/makes/:id
exports.updateMake = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    // Check duplicate name on other documents
    if (name) {
      const existing = await Make.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Make "${name}" already exists`,
        });
      }
    }

    const make = await Make.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), description, active },
      { new: true, runValidators: true },
    );

    if (!make) {
      return res
        .status(404)
        .json({ success: false, message: "Make not found" });
    }

    res.status(200).json({ success: true, data: make });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Make name must be unique" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE make ────────────────────────────────────────────────────────────
// DELETE /api/makes/:id
exports.deleteMake = async (req, res) => {
  try {
    const make = await Make.findByIdAndDelete(req.params.id);
    if (!make) {
      return res
        .status(404)
        .json({ success: false, message: "Make not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Make deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── TOGGLE active status ───────────────────────────────────────────────────
// PATCH /api/makes/:id/toggle
exports.toggleMakeStatus = async (req, res) => {
  try {
    const make = await Make.findById(req.params.id);
    if (!make) {
      return res
        .status(404)
        .json({ success: false, message: "Make not found" });
    }
    make.active = !make.active;
    await make.save();
    res.status(200).json({ success: true, data: make });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
