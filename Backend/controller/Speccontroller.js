const Spec = require("../model/spec");
const { Op } = require("sequelize");

// ── GET all specs ──────────────────────────────────────────────────────────
exports.getAllSpecs = async (req, res) => {
  try {
    const { search, active } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";

    const specs = await Spec.findAll({
      where,
      order: [["name", "ASC"]],
    });

    res.status(200).json({ success: true, count: specs.length, data: specs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single spec by ID ──────────────────────────────────────────────────
exports.getSpecById = async (req, res) => {
  try {
    const spec = await Spec.findByPk(req.params.id);
    if (!spec) return res.status(404).json({ success: false, message: "Spec not found" });
    res.status(200).json({ success: true, data: spec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE spec ────────────────────────────────────────────────────────────
exports.createSpec = async (req, res) => {
  try {
    const { name, active } = req.body;
    const existing = await Spec.findOne({ where: { name: name.trim() } });
    if (existing) return res.status(409).json({ success: false, message: `Spec "${name}" already exists` });

    const spec = await Spec.create({ name: name.trim(), active });
    res.status(201).json({ success: true, data: spec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE spec ────────────────────────────────────────────────────────────
exports.updateSpec = async (req, res) => {
  try {
    const spec = await Spec.findByPk(req.params.id);
    if (!spec) return res.status(404).json({ success: false, message: "Spec not found" });

    const { name, active } = req.body;
    if (name) {
      const existing = await Spec.findOne({
        where: { name: name.trim(), id: { [Op.ne]: req.params.id } }
      });
      if (existing) return res.status(409).json({ success: false, message: `Spec "${name}" already exists` });
    }

    await spec.update({ name: name?.trim(), active });
    res.status(200).json({ success: true, data: spec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE spec ────────────────────────────────────────────────────────────
exports.deleteSpec = async (req, res) => {
  try {
    const spec = await Spec.findByPk(req.params.id);
    if (!spec) return res.status(404).json({ success: false, message: "Spec not found" });
    await spec.destroy();
    res.status(200).json({ success: true, message: "Spec deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── TOGGLE active status ───────────────────────────────────────────────────
exports.toggleSpecStatus = async (req, res) => {
  try {
    const spec = await Spec.findByPk(req.params.id);
    if (!spec) return res.status(404).json({ success: false, message: "Spec not found" });
    spec.active = !spec.active;
    await spec.save();
    res.status(200).json({ success: true, data: spec });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
