const InventoryHead = require("../model/inventoryHead");
const MainCategory = require("../model/mainCategory");

// GET /api/inventory-heads
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const filter = {};
    if (search) filter.headName = { $regex: search, $options: "i" };
    if (active !== undefined) filter.active = active === "true";

    const heads = await InventoryHead.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: heads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/inventory-heads/:id
exports.getOne = async (req, res) => {
  try {
    const head = await InventoryHead.findById(req.params.id);
    if (!head)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, data: head });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/inventory-heads
exports.create = async (req, res) => {
  try {
    const { headName, active } = req.body;

    const exists = await InventoryHead.findOne({
      headName: { $regex: `^${headName.trim()}$`, $options: "i" },
    });
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Head name already exists" });
    }

    const head = await InventoryHead.create({
      headName: headName.trim(),
      active,
    });
    res.status(201).json({ success: true, data: head });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/inventory-heads/:id
exports.update = async (req, res) => {
  try {
    const { headName, active } = req.body;

    const duplicate = await InventoryHead.findOne({
      headName: { $regex: `^${headName.trim()}$`, $options: "i" },
      _id: { $ne: req.params.id },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Head name already exists" });
    }

    const head = await InventoryHead.findByIdAndUpdate(
      req.params.id,
      { headName: headName.trim(), active },
      { new: true, runValidators: true },
    );
    if (!head)
      return res.status(404).json({ success: false, message: "Not found" });

    // Cascade update headName in MainCategory
    await MainCategory.updateMany(
      { headId: head._id },
      { headName: head.headName },
    );

    res.json({ success: true, data: head });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/inventory-heads/:id
exports.remove = async (req, res) => {
  try {
    const head = await InventoryHead.findById(req.params.id);
    if (!head)
      return res.status(404).json({ success: false, message: "Not found" });

    // Prevent delete if categories reference this head
    const linkedCount = await MainCategory.countDocuments({ headId: head._id });
    if (linkedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${linkedCount} category(s) are linked to this head.`,
      });
    }

    await head.deleteOne();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
