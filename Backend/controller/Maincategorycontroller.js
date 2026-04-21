const MainCategory = require("../model/mainCategory"); // adjust path if needed
const InventoryHead = require("../model/inventoryHead"); // adjust path if needed

// ── GET all ───────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { headId, active } = req.query;
    const filter = {};
    if (headId) filter.headId = headId;
    if (active !== undefined) filter.active = active === "true";

    // ⚠️  Do NOT use .populate("headId") — keep headId as a plain ObjectId string
    //     so the frontend string comparison always works.
    const categories = await MainCategory.find(filter).sort({ groupName: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET one ───────────────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const category = await MainCategory.findById(req.params.id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE ────────────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { headId, groupName, active } = req.body;

    // Auto-fill headName from the referenced InventoryHead
    const head = await InventoryHead.findById(headId);
    if (!head)
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid headId — InventoryHead not found",
        });

    const category = await MainCategory.create({
      headId,
      headName: head.headName,
      groupName,
      active: active ?? true,
    });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const { headId, groupName, active } = req.body;
    const patch = { groupName, active };

    // If headId changed, refresh headName too
    if (headId) {
      const head = await InventoryHead.findById(headId);
      if (!head)
        return res
          .status(400)
          .json({
            success: false,
            message: "Invalid headId — InventoryHead not found",
          });
      patch.headId = headId;
      patch.headName = head.headName;
    }

    const category = await MainCategory.findByIdAndUpdate(
      req.params.id,
      patch,
      { new: true, runValidators: true },
    );
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const category = await MainCategory.findByIdAndDelete(req.params.id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
