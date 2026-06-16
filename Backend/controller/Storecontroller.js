const Store = require("../model/Store");
const { Op } = require("sequelize");

// GET /api/stores
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";

    const stores = await Store.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: stores });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/stores/:id
exports.getOne = async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);
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
      where: { name: name.trim() },
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

    const store = await Store.findByPk(req.params.id);
    if (!store)
      return res.status(404).json({ success: false, message: "Not found" });

    const duplicate = await Store.findOne({
      where: {
        name: name.trim(),
        id: { [Op.ne]: req.params.id },
      },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Store name already exists" });
    }

    await store.update({ name: name.trim(), location: location?.trim() || "", active });
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/stores/:id
exports.remove = async (req, res) => {
  try {
    const store = await Store.findByPk(req.params.id);
    if (!store)
      return res.status(404).json({ success: false, message: "Not found" });
    await store.destroy();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};