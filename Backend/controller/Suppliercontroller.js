const mongoose = require("mongoose");
const Supplier = require("../model/supplier");
const City = require("../model/city");
const State = require("../model/state");
const Country = require("../model/country");
const SupplierType = require("../model/supplierType");

// ─── Shared error handler ──────────────────────────────────────────────────────
function handleError(res, error, context = "supplier") {
  console.error(`[${context}] Error name:`, error.name); // ADD
  console.error(`[${context}] Error message:`, error.message); // ADD
  console.error(`[${context}] Stack:`, error.stack);
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors).map((err) => {
      const field = err.path?.split(".").pop() || err.path || "Field";
      return `${field}: ${err.message}`;
    });
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: messages,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
      errors: [`${error.path}: invalid value "${error.value}"`],
    });
  }

  return res.status(500).json({
    success: false,
    message: `Error processing ${context}`,
    error: error.message,
  });
}

// ─── Shared address validator ──────────────────────────────────────────────────
// Returns null if valid, or a { status, message } object if invalid.
// Mutates addr to set cityName / stateName / countryName from DB.
async function validateAndEnrichAddress(addr) {
  if (
    !addr.cityId ||
    !addr.stateId ||
    !addr.countryId ||
    !mongoose.Types.ObjectId.isValid(addr.cityId) ||
    !mongoose.Types.ObjectId.isValid(addr.stateId) ||
    !mongoose.Types.ObjectId.isValid(addr.countryId)
  ) {
    return {
      status: 400,
      message: "Invalid or missing city, state, or country ID in address",
    };
  }

  try {
    const city = await City.findById(addr.cityId);
    if (!city)
      return { status: 400, message: `City not found: ${addr.cityId}` };

    const state = await State.findById(addr.stateId);
    if (!state)
      return { status: 400, message: `State not found: ${addr.stateId}` };

    const country = await Country.findById(addr.countryId);
    if (!country)
      return { status: 400, message: `Country not found: ${addr.countryId}` };

    addr.cityName = city.name;
    addr.stateName = state.name;
    addr.countryName = country.name;
    return null;
  } catch (e) {
    return { status: 400, message: `Invalid ID format: ${e.message}` };
  }
}
// @desc    Get all suppliers with filters
// @route   GET /api/suppliers
// @access  Public
exports.getAllSuppliers = async (req, res) => {
  try {
    const {
      search,
      type,
      active,
      cityId,
      stateId,
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { supplierName: { $regex: search, $options: "i" } },
        { emailId1: { $regex: search, $options: "i" } },
        { emailId2: { $regex: search, $options: "i" } },
        { gstNo: { $regex: search, $options: "i" } },
        { "addresses.cityName": { $regex: search, $options: "i" } },
      ];
    }

    if (type) query.type = type;
    if (active !== undefined) query.active = active === "true";
    if (cityId) query["addresses.cityId"] = cityId;
    if (stateId) query["addresses.stateId"] = stateId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Supplier.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: suppliers.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: suppliers,
    });
  } catch (error) {
    handleError(res, error, "fetching suppliers");
  }
};

// @desc    Get single supplier
// @route   GET /api/suppliers/:id
// @access  Public
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    handleError(res, error, "fetching supplier");
  }
};

// @desc    Create new supplier
// @route   POST /api/suppliers
// @access  Public
exports.createSupplier = async (req, res) => {
  console.log("SupplierType model:", SupplierType); // ADD THIS
  console.log("Request body:", req.body);
  try {
    const {
      supplierName,
      type,
      active,
      addresses,
      gstNo,
      panNo,
      emailId1,
      emailId2,
      mobileNo1,
      mobileNo2,
    } = req.body;

    // ── Required fields ────────────────────────────────────────────────────────
    if (!supplierName || !type) {
      return res.status(400).json({
        success: false,
        message: "Supplier name and type are required",
      });
    }

    // ── Validate type against SupplierType collection ──────────────────────────
    const validType = await SupplierType.findOne({ name: type, active: true });
    if (!validType) {
      return res.status(400).json({
        success: false,
        message: `Invalid supplier type: "${type}". Please select a valid category.`,
      });
    }

    // ── Validate & enrich addresses ────────────────────────────────────────────
    if (addresses && addresses.length > 0) {
      for (const addr of addresses) {
        const err = await validateAndEnrichAddress(addr);
        if (err)
          return res
            .status(err.status)
            .json({ success: false, message: err.message });
      }
    }

    const supplier = await Supplier.create({
      supplierName,
      type,
      active,
      addresses: addresses || [],
      gstNo,
      panNo,
      emailId1,
      emailId2,
      mobileNo1,
      mobileNo2,
    });

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error) {
    handleError(res, error, "creating supplier");
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Public
exports.updateSupplier = async (req, res) => {
  try {
    const existing = await Supplier.findById(req.params.id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    const {
      supplierName,
      type,
      active,
      addresses,
      gstNo,
      panNo,
      emailId1,
      emailId2,
      mobileNo1,
      mobileNo2,
    } = req.body;

    // ── Validate type against SupplierType collection ──────────────────────────
    if (type) {
      const validType = await SupplierType.findOne({
        name: type,
        active: true,
      });
      if (!validType) {
        return res.status(400).json({
          success: false,
          message: `Invalid supplier type: "${type}". Please select a valid category.`,
        });
      }
    }

    // ── Validate & enrich addresses ────────────────────────────────────────────
    if (addresses && addresses.length > 0) {
      for (const addr of addresses) {
        const err = await validateAndEnrichAddress(addr);
        if (err)
          return res
            .status(err.status)
            .json({ success: false, message: err.message });
      }
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      {
        supplierName,
        type,
        active,
        addresses: addresses || [],
        gstNo,
        panNo,
        emailId1,
        emailId2,
        mobileNo1,
        mobileNo2,
      },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    handleError(res, error, "updating supplier");
  }
};

// @desc    Delete supplier
// @route   DELETE /api/suppliers/:id
// @access  Public
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }
    await supplier.deleteOne();
    res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
      data: {},
    });
  } catch (error) {
    handleError(res, error, "deleting supplier");
  }
};

// @desc    Add address to supplier
// @route   POST /api/suppliers/:id/addresses
// @access  Public
exports.addAddress = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    const { address, pinCode, cityId, stateId, countryId, note, isPrimary } =
      req.body;

    if (!address || !cityId || !stateId || !countryId) {
      return res.status(400).json({
        success: false,
        message: "Address, city, state, and country are required",
      });
    }

    const addrObj = {
      address,
      pinCode,
      cityId,
      stateId,
      countryId,
      note,
      isPrimary,
    };
    const err = await validateAndEnrichAddress(addrObj);
    if (err)
      return res
        .status(err.status)
        .json({ success: false, message: err.message });

    if (isPrimary) {
      supplier.addresses.forEach((a) => (a.isPrimary = false));
    }

    supplier.addresses.push({
      address: addrObj.address,
      pinCode: addrObj.pinCode,
      cityId: addrObj.cityId,
      cityName: addrObj.cityName,
      stateId: addrObj.stateId,
      stateName: addrObj.stateName,
      countryId: addrObj.countryId,
      countryName: addrObj.countryName,
      note: addrObj.note || "",
      isPrimary: addrObj.isPrimary || false,
    });

    await supplier.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      data: supplier,
    });
  } catch (error) {
    handleError(res, error, "adding address");
  }
};

// @desc    Update address
// @route   PUT /api/suppliers/:id/addresses/:addressId
// @access  Public
exports.updateAddress = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    const addressIndex = supplier.addresses.findIndex(
      (a) => a._id.toString() === req.params.addressId,
    );
    if (addressIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const { address, pinCode, cityId, stateId, countryId, note, isPrimary } =
      req.body;

    // Validate & enrich only the changed ID fields
    if (cityId || stateId || countryId) {
      const partial = {
        cityId: cityId || supplier.addresses[addressIndex].cityId.toString(),
        stateId: stateId || supplier.addresses[addressIndex].stateId.toString(),
        countryId:
          countryId || supplier.addresses[addressIndex].countryId.toString(),
      };
      const err = await validateAndEnrichAddress(partial);
      if (err)
        return res
          .status(err.status)
          .json({ success: false, message: err.message });

      supplier.addresses[addressIndex].cityId = partial.cityId;
      supplier.addresses[addressIndex].cityName = partial.cityName;
      supplier.addresses[addressIndex].stateId = partial.stateId;
      supplier.addresses[addressIndex].stateName = partial.stateName;
      supplier.addresses[addressIndex].countryId = partial.countryId;
      supplier.addresses[addressIndex].countryName = partial.countryName;
    }

    if (address !== undefined)
      supplier.addresses[addressIndex].address = address;
    if (pinCode !== undefined)
      supplier.addresses[addressIndex].pinCode = pinCode;
    if (note !== undefined) supplier.addresses[addressIndex].note = note;

    if (isPrimary) {
      supplier.addresses.forEach((a, i) => {
        a.isPrimary = i === addressIndex;
      });
    }

    await supplier.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      data: supplier,
    });
  } catch (error) {
    handleError(res, error, "updating address");
  }
};

// @desc    Delete address
// @route   DELETE /api/suppliers/:id/addresses/:addressId
// @access  Public
exports.deleteAddress = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ success: false, message: "Supplier not found" });
    }

    const addressIndex = supplier.addresses.findIndex(
      (a) => a._id.toString() === req.params.addressId,
    );
    if (addressIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const wasPrimary = supplier.addresses[addressIndex].isPrimary;
    supplier.addresses.splice(addressIndex, 1);

    if (wasPrimary && supplier.addresses.length > 0) {
      supplier.addresses[0].isPrimary = true;
    }

    await supplier.save();

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      data: supplier,
    });
  } catch (error) {
    handleError(res, error, "deleting address");
  }
};

// @desc    Get suppliers by type
// @route   GET /api/suppliers/type/:type
// @access  Public
exports.getSuppliersByType = async (req, res) => {
  try {
    const suppliers = await Supplier.find({ type: req.params.type }).sort({
      supplierName: 1,
    });
    res
      .status(200)
      .json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    handleError(res, error, "fetching suppliers by type");
  }
};
