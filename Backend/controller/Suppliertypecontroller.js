const SupplierType = require("../model/supplierType");

// @desc    Get all supplier types
// @route   GET /api/supplier-types
// @access  Public
exports.getAllSupplierTypes = async (req, res) => {
  try {
    const { active, search } = req.query;

    const query = {};

    if (active !== undefined) {
      query.active = active === "true";
    }

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const types = await SupplierType.find(query).sort({ order: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: types.length,
      data: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching supplier types",
      error: error.message,
    });
  }
};

// @desc    Get single supplier type
// @route   GET /api/supplier-types/:id
// @access  Public
exports.getSupplierType = async (req, res) => {
  try {
    const type = await SupplierType.findById(req.params.id);

    if (!type) {
      return res.status(404).json({
        success: false,
        message: "Supplier type not found",
      });
    }

    res.status(200).json({
      success: true,
      data: type,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching supplier type",
      error: error.message,
    });
  }
};

// @desc    Create new supplier type
// @route   POST /api/supplier-types
// @access  Public
exports.createSupplierType = async (req, res) => {
  try {
    const { name, description, color, bgColor, active, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Supplier type name is required",
      });
    }

    // Check if type already exists
    const existingType = await SupplierType.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingType) {
      return res.status(400).json({
        success: false,
        message: "Supplier type already exists",
      });
    }

    const type = await SupplierType.create({
      name,
      description,
      color,
      bgColor,
      active,
      order,
    });

    res.status(201).json({
      success: true,
      message: "Supplier type created successfully",
      data: type,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Supplier type already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating supplier type",
      error: error.message,
    });
  }
};

// @desc    Update supplier type
// @route   PUT /api/supplier-types/:id
// @access  Public
exports.updateSupplierType = async (req, res) => {
  try {
    let type = await SupplierType.findById(req.params.id);

    if (!type) {
      return res.status(404).json({
        success: false,
        message: "Supplier type not found",
      });
    }

    const { name, description, color, bgColor, active, order } = req.body;

    // Check if new name conflicts with existing type
    if (name && name !== type.name) {
      const existingType = await SupplierType.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: req.params.id },
      });

      if (existingType) {
        return res.status(400).json({
          success: false,
          message: "Supplier type with this name already exists",
        });
      }
    }

    type = await SupplierType.findByIdAndUpdate(
      req.params.id,
      { name, description, color, bgColor, active, order },
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      message: "Supplier type updated successfully",
      data: type,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating supplier type",
      error: error.message,
    });
  }
};

// @desc    Delete supplier type
// @route   DELETE /api/supplier-types/:id
// @access  Public
exports.deleteSupplierType = async (req, res) => {
  try {
    const type = await SupplierType.findById(req.params.id);

    if (!type) {
      return res.status(404).json({
        success: false,
        message: "Supplier type not found",
      });
    }

    // Check if any suppliers are using this type
    const Supplier = require("../model/supplier");
    const suppliersUsingType = await Supplier.countDocuments({
      type: type.name,
    });

    if (suppliersUsingType > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${suppliersUsingType} supplier(s) are using this type`,
      });
    }

    await type.deleteOne();

    res.status(200).json({
      success: true,
      message: "Supplier type deleted successfully",
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting supplier type",
      error: error.message,
    });
  }
};

// @desc    Reorder supplier types
// @route   PUT /api/supplier-types/reorder
// @access  Public
exports.reorderSupplierTypes = async (req, res) => {
  try {
    const { typeIds } = req.body; // Array of type IDs in new order

    if (!Array.isArray(typeIds)) {
      return res.status(400).json({
        success: false,
        message: "typeIds must be an array",
      });
    }

    // Update order for each type
    const updatePromises = typeIds.map((id, index) =>
      SupplierType.findByIdAndUpdate(id, { order: index }),
    );

    await Promise.all(updatePromises);

    const types = await SupplierType.find().sort({ order: 1 });

    res.status(200).json({
      success: true,
      message: "Supplier types reordered successfully",
      data: types,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error reordering supplier types",
      error: error.message,
    });
  }
};
