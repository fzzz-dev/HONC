const MainCategory = require("../model/mainCategory");
const InventoryHead = require("../model/inventoryHead");

// ── GET all ───────────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { headId, active } = req.query;
    const where = {};
    if (headId) where.headId = headId;
    if (active !== undefined) where.active = active === "true";

    const categories = await MainCategory.findAll({
      where,
      order: [["groupName", "ASC"]],
    });
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET one ───────────────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const category = await MainCategory.findByPk(req.params.id);
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

    const head = await InventoryHead.findByPk(headId);
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
    const category = await MainCategory.findByPk(req.params.id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    const { headId, groupName, active } = req.body;
    const patch = { groupName, active };

    if (headId) {
      const head = await InventoryHead.findByPk(headId);
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

    await category.update(patch);
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────────
exports.remove = async (req, res) => {
  try {
    const category = await MainCategory.findByPk(req.params.id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });

    await category.destroy();
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
