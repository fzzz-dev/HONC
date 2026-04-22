const SupplierType = require("../model/supplierType");
const Supplier = require("../model/supplier");
const { Op } = require("sequelize");

// @desc    Get all supplier types
exports.getAllSupplierTypes = async (req, res) => {
  try {
    const { active, search } = req.query;
    const where = {};
    if (active !== undefined) where.active = active === "true";
    if (search) where.name = { [Op.like]: `%${search}%` };

    const types = await SupplierType.findAll({
      where,
      order: [["order", "ASC"], ["name", "ASC"]],
    });

    res.status(200).json({ success: true, count: types.length, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching supplier types", error: error.message });
  }
};

// @desc    Get single supplier type
exports.getSupplierType = async (req, res) => {
  try {
    const type = await SupplierType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: "Supplier type not found" });
    res.status(200).json({ success: true, data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching supplier type", error: error.message });
  }
};

// @desc    Create new supplier type
exports.createSupplierType = async (req, res) => {
  try {
    const { name, description, color, bgColor, active, order } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Supplier type name is required" });

    const existingType = await SupplierType.findOne({ where: { name: name.trim() } });
    if (existingType) return res.status(400).json({ success: false, message: "Supplier type already exists" });

    const type = await SupplierType.create({ name, description, color, bgColor, active, order });
    res.status(201).json({ success: true, message: "Supplier type created successfully", data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating supplier type", error: error.message });
  }
};

// @desc    Update supplier type
exports.updateSupplierType = async (req, res) => {
  try {
    const type = await SupplierType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: "Supplier type not found" });

    const { name, description, color, bgColor, active, order } = req.body;
    if (name && name !== type.name) {
      const existingType = await SupplierType.findOne({ where: { name: name.trim(), id: { [Op.ne]: req.params.id } } });
      if (existingType) return res.status(400).json({ success: false, message: "Supplier type with this name already exists" });
    }

    await type.update({ name, description, color, bgColor, active, order });
    res.status(200).json({ success: true, message: "Supplier type updated successfully", data: type });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating supplier type", error: error.message });
  }
};

// @desc    Delete supplier type
exports.deleteSupplierType = async (req, res) => {
  try {
    const type = await SupplierType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: "Supplier type not found" });

    const suppliersUsingType = await Supplier.count({ where: { type: type.name } });
    if (suppliersUsingType > 0) {
      return res.status(400).json({ success: false, message: `Cannot delete. ${suppliersUsingType} supplier(s) are using this type` });
    }

    await type.destroy();
    res.status(200).json({ success: true, message: "Supplier type deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting supplier type", error: error.message });
  }
};

// @desc    Reorder supplier types
exports.reorderSupplierTypes = async (req, res) => {
  try {
    const { typeIds } = req.body;
    if (!Array.isArray(typeIds)) return res.status(400).json({ success: false, message: "typeIds must be an array" });

    for (let i = 0; i < typeIds.length; i++) {
      await SupplierType.update({ order: i }, { where: { id: typeIds[i] } });
    }

    const types = await SupplierType.findAll({ order: [["order", "ASC"]] });
    res.status(200).json({ success: true, message: "Supplier types reordered successfully", data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error reordering supplier types", error: error.message });
  }
};
