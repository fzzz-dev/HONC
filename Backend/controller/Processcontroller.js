const Process = require("../model/Process");
const Department = require("../model/Department");
const { Op } = require("sequelize");

// GET /api/processes
exports.getAll = async (req, res) => {
  try {
    const { search = "", active, departmentId } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";
    if (departmentId) where.departmentId = departmentId;

    const processes = await Process.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: processes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/processes/:id
exports.getOne = async (req, res) => {
  try {
    const process = await Process.findByPk(req.params.id);
    if (!process)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: process });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/processes
exports.create = async (req, res) => {
  try {
    const { name, departmentId, active } = req.body;

    const exists = await Process.findOne({
      where: { name: name.trim() },
    });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Process name already exists" });
    }

    let departmentName = "";
    if (departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (dept) departmentName = dept.name;
    }

    const process = await Process.create({
      name: name.trim(),
      departmentId: departmentId || null,
      departmentName,
      active,
    });
    res.status(201).json({ success: true, data: process });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/processes/:id
exports.update = async (req, res) => {
  try {
    const { name, departmentId, active } = req.body;

    const process = await Process.findByPk(req.params.id);
    if (!process)
      return res.status(404).json({ success: false, message: "Not found" });

    const duplicate = await Process.findOne({
      where: {
        name: name.trim(),
        id: { [Op.ne]: req.params.id },
      },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Process name already exists" });
    }

    let departmentName = "";
    if (departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (dept) departmentName = dept.name;
    }

    await process.update({ name: name.trim(), departmentId: departmentId || null, departmentName, active });
    res.json({ success: true, data: process });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/processes/:id
exports.remove = async (req, res) => {
  try {
    const process = await Process.findByPk(req.params.id);
    if (!process)
      return res.status(404).json({ success: false, message: "Not found" });
    await process.destroy();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};