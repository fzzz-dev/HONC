const Department = require("../model/Department");
const { Op } = require("sequelize");

// GET /api/departments
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";

    const departments = await Department.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/departments/:id
exports.getOne = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: department });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/departments
exports.create = async (req, res) => {
  try {
    const { name, code, active } = req.body;

    const exists = await Department.findOne({
      where: { name: name.trim() },
    });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Department name already exists" });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code?.trim() || "",
      active,
    });
    res.status(201).json({ success: true, data: department });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/departments/:id
exports.update = async (req, res) => {
  try {
    const { name, code, active } = req.body;

    const department = await Department.findByPk(req.params.id);
    if (!department)
      return res.status(404).json({ success: false, message: "Not found" });

    const duplicate = await Department.findOne({
      where: {
        name: name.trim(),
        id: { [Op.ne]: req.params.id },
      },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Department name already exists" });
    }

    await department.update({ name: name.trim(), code: code?.trim() || "", active });
    res.json({ success: true, data: department });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/departments/:id
exports.remove = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department)
      return res.status(404).json({ success: false, message: "Not found" });
    await department.destroy();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};