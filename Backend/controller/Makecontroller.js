const Make = require("../model/make");
const { Op } = require("sequelize");

// ── GET all makes ──────────────────────────────────────────────────────────
exports.getAllMakes = async (req, res) => {
  try {
    const { search, active } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";

    const makes = await Make.findAll({
      where,
      order: [["name", "ASC"]],
    });

    res.status(200).json({ success: true, count: makes.length, data: makes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET single make by ID ──────────────────────────────────────────────────
exports.getMakeById = async (req, res) => {
  try {
    const make = await Make.findByPk(req.params.id);
    if (!make) return res.status(404).json({ success: false, message: "Make not found" });
    res.status(200).json({ success: true, data: make });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE make ────────────────────────────────────────────────────────────
exports.createMake = async (req, res) => {
  try {
    const { name, description, active } = req.body;
    const existing = await Make.findOne({ where: { name: name.trim() } });
    if (existing) return res.status(409).json({ success: false, message: `Make "${name}" already exists` });

    const make = await Make.create({ name: name.trim(), description, active });
    res.status(201).json({ success: true, data: make });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE make ────────────────────────────────────────────────────────────
exports.updateMake = async (req, res) => {
  try {
    const make = await Make.findByPk(req.params.id);
    if (!make) return res.status(404).json({ success: false, message: "Make not found" });

    const { name, description, active } = req.body;
    if (name) {
      const existing = await Make.findOne({
        where: { name: name.trim(), id: { [Op.ne]: req.params.id } }
      });
      if (existing) return res.status(409).json({ success: false, message: `Make "${name}" already exists` });
    }

    await make.update({ name: name?.trim(), description, active });
    res.status(200).json({ success: true, data: make });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE make ────────────────────────────────────────────────────────────
exports.deleteMake = async (req, res) => {
  try {
    const make = await Make.findByPk(req.params.id);
    if (!make) return res.status(404).json({ success: false, message: "Make not found" });
    await make.destroy();
    res.status(200).json({ success: true, message: "Make deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── TOGGLE active status ───────────────────────────────────────────────────
exports.toggleMakeStatus = async (req, res) => {
  try {
    const make = await Make.findByPk(req.params.id);
    if (!make) return res.status(404).json({ success: false, message: "Make not found" });
    make.active = !make.active;
    await make.save();
    res.status(200).json({ success: true, data: make });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
