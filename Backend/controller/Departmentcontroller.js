const Department = require("../model/Department");

// GET /api/departments
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (active !== undefined) filter.active = active === "true";

    const departments = await Department.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/departments/:id
exports.getOne = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
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
      name: { $regex: `^${name.trim()}$`, $options: "i" },
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

    const duplicate = await Department.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Department name already exists" });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), code: code?.trim() || "", active },
      { new: true, runValidators: true }
    );
    if (!department)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: department });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/departments/:id
exports.remove = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department)
      return res.status(404).json({ success: false, message: "Not found" });
    await department.deleteOne();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};