const Process = require("../model/Process");
const Department = require("../model/Department");

// GET /api/processes
exports.getAll = async (req, res) => {
  try {
    const { search = "", active, departmentId } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: "i" };
    if (active !== undefined) filter.active = active === "true";
    if (departmentId) filter.departmentId = departmentId;

    const processes = await Process.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: processes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/processes/:id
exports.getOne = async (req, res) => {
  try {
    const process = await Process.findById(req.params.id);
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
      name: { $regex: `^${name.trim()}$`, $options: "i" },
    });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Process name already exists" });
    }

    // Resolve department name from id
    let departmentName = "";
    if (departmentId) {
      const dept = await Department.findById(departmentId);
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

    const duplicate = await Process.findOne({
      name: { $regex: `^${name.trim()}$`, $options: "i" },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Process name already exists" });
    }

    // Resolve department name from id
    let departmentName = "";
    if (departmentId) {
      const dept = await Department.findById(departmentId);
      if (dept) departmentName = dept.name;
    }

    const process = await Process.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), departmentId: departmentId || null, departmentName, active },
      { new: true, runValidators: true }
    );
    if (!process)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: process });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/processes/:id
exports.remove = async (req, res) => {
  try {
    const process = await Process.findById(req.params.id);
    if (!process)
      return res.status(404).json({ success: false, message: "Not found" });
    await process.deleteOne();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};