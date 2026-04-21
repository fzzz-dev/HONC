const Spec = require("../model/spec");

// ── GET all specs ──────────────────────────────────────────────────────────
// GET /api/specs
// Query params: ?search=&active=true|false
exports.getAllSpecs = async (req, res) => {
  try {
    const { search, active } = req.query;

    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }
    if (active !== undefined) {
      filter.active = active === "true";
    }

    const specs = await Spec.find(filter).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: specs.length,
      data: specs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single spec by ID ──────────────────────────────────────────────────
// GET /api/specs/:id
exports.getSpecById = async (req, res) => {
  try {
    const spec = await Spec.findById(req.params.id);
    if (!spec) {
      return res
        .status(404)
        .json({ success: false, message: "Spec not found" });
    }
    res.status(200).json({ success: true, data: spec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE spec ────────────────────────────────────────────────────────────
// POST /api/specs
exports.createSpec = async (req, res) => {
  try {
    const { name, active } = req.body;

    // Check duplicate name (case-insensitive)
    const existing = await Spec.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Spec "${name}" already exists`,
      });
    }

    const spec = await Spec.create({ name: name.trim(), active });

    res.status(201).json({ success: true, data: spec });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Spec name must be unique" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE spec ────────────────────────────────────────────────────────────
// PUT /api/specs/:id
exports.updateSpec = async (req, res) => {
  try {
    const { name, active } = req.body;

    // Check duplicate name on other documents
    if (name) {
      const existing = await Spec.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `Spec "${name}" already exists`,
        });
      }
    }

    const spec = await Spec.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), active },
      { new: true, runValidators: true },
    );

    if (!spec) {
      return res
        .status(404)
        .json({ success: false, message: "Spec not found" });
    }

    res.status(200).json({ success: true, data: spec });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Spec name must be unique" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE spec ────────────────────────────────────────────────────────────
// DELETE /api/specs/:id
exports.deleteSpec = async (req, res) => {
  try {
    const spec = await Spec.findByIdAndDelete(req.params.id);
    if (!spec) {
      return res
        .status(404)
        .json({ success: false, message: "Spec not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Spec deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── TOGGLE active status ───────────────────────────────────────────────────
// PATCH /api/specs/:id/toggle
exports.toggleSpecStatus = async (req, res) => {
  try {
    const spec = await Spec.findById(req.params.id);
    if (!spec) {
      return res
        .status(404)
        .json({ success: false, message: "Spec not found" });
    }
    spec.active = !spec.active;
    await spec.save();
    res.status(200).json({ success: true, data: spec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
