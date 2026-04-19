const MainCategory = require("../model/MainCategory");
const InventoryHead = require("../model/InventoryHead");

// GET /api/main-categories
exports.getAll = async (req, res) => {
  try {
    const { search = "", headId, active } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { groupName: { $regex: search, $options: "i" } },
        { headName: { $regex: search, $options: "i" } },
      ];
    }
    if (headId) filter.headId = headId;
    if (active !== undefined) filter.active = active === "true";

    const categories = await MainCategory.find(filter)
      .populate("headId", "headName active")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/main-categories/:id
exports.getOne = async (req, res) => {
  try {
    const category = await MainCategory.findById(req.params.id).populate(
      "headId",
      "headName active",
    );
    if (!category)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/main-categories
exports.create = async (req, res) => {
  try {
    const { headId, groupName, active } = req.body;

    // Fetch and sync headName from InventoryHead
    const head = await InventoryHead.findById(headId);
    if (!head) {
      return res
        .status(400)
        .json({ success: false, message: "Inventory head not found" });
    }

    const duplicate = await MainCategory.findOne({
      headId,
      groupName: { $regex: `^${groupName.trim()}$`, $options: "i" },
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Group name already exists under this head",
      });
    }

    const category = await MainCategory.create({
      headId,
      headName: head.headName, // always sourced from the head document
      groupName: groupName.trim(),
      active,
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/main-categories/:id
exports.update = async (req, res) => {
  try {
    const { headId, groupName, active } = req.body;

    const head = await InventoryHead.findById(headId);
    if (!head) {
      return res
        .status(400)
        .json({ success: false, message: "Inventory head not found" });
    }

    const duplicate = await MainCategory.findOne({
      headId,
      groupName: { $regex: `^${groupName.trim()}$`, $options: "i" },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Group name already exists under this head",
      });
    }

    const category = await MainCategory.findByIdAndUpdate(
      req.params.id,
      {
        headId,
        headName: head.headName, // keep in sync
        groupName: groupName.trim(),
        active,
      },
      { new: true, runValidators: true },
    );
    if (!category)
      return res.status(404).json({ success: false, message: "Not found" });

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/main-categories/:id
exports.remove = async (req, res) => {
  try {
    const category = await MainCategory.findById(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Not found" });

    await category.deleteOne();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
