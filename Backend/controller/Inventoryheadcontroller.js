const InventoryHead = require("../model/inventoryHead");
const MainCategory = require("../model/mainCategory");
const { Op } = require("sequelize");

// GET /api/inventory-heads
exports.getAll = async (req, res) => {
  try {
    const { search = "", active } = req.query;
    const where = {};
    if (search) where.headName = { [Op.like]: `%${search}%` };
    if (active !== undefined) where.active = active === "true";

    const heads = await InventoryHead.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: heads });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/inventory-heads/:id
exports.getOne = async (req, res) => {
  try {
    const head = await InventoryHead.findByPk(req.params.id);
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
      where: {
        headName: headName.trim(),
      },
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

    const head = await InventoryHead.findByPk(req.params.id);
    if (!head)
      return res.status(404).json({ success: false, message: "Not found" });

    const duplicate = await InventoryHead.findOne({
      where: {
        headName: headName.trim(),
        id: { [Op.ne]: req.params.id },
      },
    });
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Head name already exists" });
    }

    await head.update({ headName: headName.trim(), active });

    // Cascade update headName in MainCategory
    await MainCategory.update(
      { headName: head.headName },
      { where: { headId: head.id } }
    );

    res.json({ success: true, data: head });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/inventory-heads/:id
exports.remove = async (req, res) => {
  try {
    const head = await InventoryHead.findByPk(req.params.id);
    if (!head)
      return res.status(404).json({ success: false, message: "Not found" });

    // Prevent delete if categories reference this head
    const linkedCount = await MainCategory.count({ where: { headId: head.id } });
    if (linkedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${linkedCount} category(s) are linked to this head.`,
      });
    }

    await head.destroy();
    res.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
