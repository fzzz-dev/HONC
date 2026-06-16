const Uom = require("../model/uom");
const { Op } = require("sequelize");

// GET /api/uoms
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";

    const uoms = await Uom.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: uoms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/uoms/:id
exports.getOne = async (req, res) => {
  try {
    const uom = await Uom.findByPk(req.params.id);
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
      where: { name: name.trim() },
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

    const uom = await Uom.findByPk(req.params.id);
    if (!uom)
      return res.status(404).json({ success: false, message: "Not found" });

    const duplicate = await Uom.findOne({
      where: {
        name: name.trim(),
        id: { [Op.ne]: req.params.id },
      },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "UOM name already exists" });
    }

    await uom.update({ name: name.trim(), description: description?.trim() || "", active });
    res.json({ success: true, data: uom });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/uoms/:id
exports.remove = async (req, res) => {
  try {
    const uom = await Uom.findByPk(req.params.id);
    if (!uom)
      return res.status(404).json({ success: false, message: "Not found" });
    await uom.destroy();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
