const Supplier = require("../model/supplier");
const City = require("../model/city");
const State = require("../model/state");
const Country = require("../model/country");
const SupplierType = require("../model/supplierType");
const PaymentTerm = require("../model/paymentTerm");
const { Op } = require("sequelize");

const PINCODE_IN = /^\d{6}$/;

// ─── Shared error handler ──────────────────────────────────────────────────────
function handleError(res, error, context = "supplier") {
  console.error(`[${context}] Error:`, error);
  return res.status(500).json({
    success: false,
    message: `Error processing ${context}`,
    error: error.message,
  });
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeRequiredText(value) {
  return String(value || "").trim();
}

function normalizeBoolean(value, fallback = true) {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}

function normalizeSupplierPayload(body = {}, fallbackActive = true) {
  const shortRaw = String(body.shortCode ?? "").trim().toUpperCase();
  const shortCode = shortRaw.slice(0, 5);
  let paymentTermsId = body.paymentTermsId;
  if (paymentTermsId === "" || paymentTermsId === undefined) {
    paymentTermsId = null;
  } else {
    paymentTermsId = parseInt(paymentTermsId, 10);
    if (Number.isNaN(paymentTermsId)) paymentTermsId = null;
  }
  let purchaseCategoryIds = [];
  if (Array.isArray(body.purchaseCategoryIds)) {
    purchaseCategoryIds = [
      ...new Set(
        body.purchaseCategoryIds
          .map((x) => parseInt(x, 10))
          .filter((n) => !Number.isNaN(n)),
      ),
    ];
  }
  return {
    supplierName: normalizeRequiredText(body.supplierName),
    shortCode,
    type: normalizeRequiredText(body.type),
    active: normalizeBoolean(body.active, fallbackActive),
    addresses: Array.isArray(body.addresses) ? body.addresses : [],
    gstNo: normalizeOptionalText(body.gstNo),
    panNo: normalizeOptionalText(body.panNo),
    emailId1: normalizeOptionalText(body.emailId1),
    emailId2: normalizeOptionalText(body.emailId2),
    mobileNo1: normalizeOptionalText(body.mobileNo1),
    mobileNo2: normalizeOptionalText(body.mobileNo2),
    gstType: body.gstType || "local",
    paymentTermsId,
    purchaseCategoryIds,
  };
}

// ─── Shared address validator ──────────────────────────────────────────────────
async function validateAndEnrichAddress(addr) {
  const line1 = String(addr.line1 ?? addr.address ?? "").trim();
  const line2 = String(addr.line2 ?? "").trim();
  addr.line1 = line1;
  addr.line2 = line2;
  addr.address = [line1, line2].filter(Boolean).join(", ");

  if (!line1) {
    return { status: 400, message: "Address line 1 is required" };
  }

  const pin = String(addr.pinCode ?? "").trim();
  if (pin && !PINCODE_IN.test(pin)) {
    return {
      status: 400,
      message: "Pincode must be exactly 6 digits",
    };
  }

  if (!addr.cityId || !addr.stateId || !addr.countryId) {
    return {
      status: 400,
      message: "Missing city, state, or country ID in address",
    };
  }

  try {
    const city = await City.findByPk(addr.cityId);
    if (!city) return { status: 400, message: `City not found: ${addr.cityId}` };

    const state = await State.findByPk(addr.stateId);
    if (!state) return { status: 400, message: `State not found: ${addr.stateId}` };

    const country = await Country.findByPk(addr.countryId);
    if (!country) return { status: 400, message: `Country not found: ${addr.countryId}` };

    addr.cityName = city.name;
    addr.stateName = state.name;
    addr.countryName = country.name;
    return null;
  } catch (e) {
    return { status: 400, message: `Invalid ID format: ${e.message}` };
  }
}

// @desc    Get all suppliers with filters
exports.getAllSuppliers = async (req, res) => {
  try {
    const { search, type, active, cityId, stateId, page = 1, limit = 100 } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { supplierName: { [Op.like]: `%${search}%` } },
        { emailId1: { [Op.like]: `%${search}%` } },
        { emailId2: { [Op.like]: `%${search}%` } },
        { gstNo: { [Op.like]: `%${search}%` } },
      ];
    }

    if (type) where.type = type;
    if (active !== undefined) where.active = active === "true";
    
    // JSON filtering for cityId/stateId in addresses array
    // Note: This might be slow in SQL but keeps the NoSQL logic working.
    // For better performance, addresses should be a separate table.
    
    const { count, rows } = await Supplier.findAndCountAll({
      where,
      offset: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: rows.length,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / parseInt(limit)),
      data: rows,
    });
  } catch (error) {
    handleError(res, error, "fetching suppliers");
  }
};

// @desc    Get single supplier
exports.getSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error) {
    handleError(res, error, "fetching supplier");
  }
};

// @desc    Create new supplier
exports.createSupplier = async (req, res) => {
  try {
    const payload = normalizeSupplierPayload(req.body);
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
      gstType,
    } = payload;

    if (!supplierName || !type) {
      return res.status(400).json({ success: false, message: "Supplier name and type are required" });
    }

    if (!payload.shortCode || payload.shortCode.length < 1 || payload.shortCode.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Short code is required (1–5 characters)",
      });
    }

    if (payload.paymentTermsId) {
      const pt = await PaymentTerm.findByPk(payload.paymentTermsId);
      if (!pt) {
        return res.status(400).json({ success: false, message: "Invalid payment terms" });
      }
    }

    const validType = await SupplierType.findOne({ where: { name: type, active: true } });
    if (!validType) {
      return res.status(400).json({ success: false, message: `Invalid supplier type: "${type}"` });
    }

    if (addresses && addresses.length > 0) {
      for (const addr of addresses) {
        const err = await validateAndEnrichAddress(addr);
        if (err) return res.status(err.status).json({ success: false, message: err.message });
      }
    }

    const supplier = await Supplier.create({
      supplierName,
      shortCode: payload.shortCode,
      type,
      active,
      addresses: addresses || [],
      gstNo,
      panNo,
      emailId1,
      emailId2,
      mobileNo1,
      mobileNo2,
      gstType,
      paymentTermsId: payload.paymentTermsId,
      purchaseCategoryIds: payload.purchaseCategoryIds,
    });

    res.status(201).json({ success: true, message: "Supplier created successfully", data: supplier });
  } catch (error) {
    handleError(res, error, "creating supplier");
  }
};

// @desc    Update supplier
exports.updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    const payload = normalizeSupplierPayload(req.body, supplier.active);
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
      gstType,
    } = payload;

    if (!payload.shortCode || payload.shortCode.length < 1 || payload.shortCode.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Short code is required (1–5 characters)",
      });
    }

    if (payload.paymentTermsId) {
      const pt = await PaymentTerm.findByPk(payload.paymentTermsId);
      if (!pt) {
        return res.status(400).json({ success: false, message: "Invalid payment terms" });
      }
    }

    if (type) {
      const validType = await SupplierType.findOne({ where: { name: type, active: true } });
      if (!validType) {
        return res.status(400).json({ success: false, message: `Invalid supplier type: "${type}"` });
      }
    }

    if (addresses && addresses.length > 0) {
      for (const addr of addresses) {
        const err = await validateAndEnrichAddress(addr);
        if (err) return res.status(err.status).json({ success: false, message: err.message });
      }
    }

    await supplier.update({
      supplierName,
      shortCode: payload.shortCode,
      type,
      active,
      addresses: addresses || [],
      gstNo,
      panNo,
      emailId1,
      emailId2,
      mobileNo1,
      mobileNo2,
      gstType,
      paymentTermsId: payload.paymentTermsId,
      purchaseCategoryIds: payload.purchaseCategoryIds,
    });

    res.status(200).json({ success: true, message: "Supplier updated successfully", data: supplier });
  } catch (error) {
    handleError(res, error, "updating supplier");
  }
};

// @desc    Delete supplier
exports.deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }
    await supplier.destroy();
    res.status(200).json({ success: true, message: "Supplier deleted successfully", data: {} });
  } catch (error) {
    handleError(res, error, "deleting supplier");
  }
};

// @desc    Add address to supplier
exports.addAddress = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

    const { address, pinCode, cityId, stateId, countryId, note, isPrimary } = req.body;
    if (!address || !cityId || !stateId || !countryId) {
      return res.status(400).json({ success: false, message: "Address, city, state, and country are required" });
    }

    const addrObj = { address, pinCode, cityId, stateId, countryId, note, isPrimary };
    const err = await validateAndEnrichAddress(addrObj);
    if (err) return res.status(err.status).json({ success: false, message: err.message });

    const currentAddresses = [...(supplier.addresses || [])];
    if (isPrimary) {
      currentAddresses.forEach((a) => (a.isPrimary = false));
    }

    currentAddresses.push({
      ...addrObj,
      id: Date.now(), // Generate a simple ID for the address
    });

    await supplier.update({ addresses: currentAddresses });
    res.status(201).json({ success: true, message: "Address added successfully", data: supplier });
  } catch (error) {
    handleError(res, error, "adding address");
  }
};

// @desc    Update address in supplier
exports.updateAddress = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

    const { addressId } = req.params;
    const { address, pinCode, cityId, stateId, countryId, note, isPrimary } = req.body;

    let currentAddresses = [...(supplier.addresses || [])];
    const index = currentAddresses.findIndex((a) => String(a.id || a._id) === String(addressId));

    if (index === -1) return res.status(404).json({ success: false, message: "Address not found" });

    const addrObj = { ...currentAddresses[index], ...req.body };
    const err = await validateAndEnrichAddress(addrObj);
    if (err) return res.status(err.status).json({ success: false, message: err.message });

    if (isPrimary) {
      currentAddresses.forEach((a) => (a.isPrimary = false));
    }

    currentAddresses[index] = addrObj;
    await supplier.update({ addresses: currentAddresses });

    res.status(200).json({ success: true, message: "Address updated successfully", data: supplier });
  } catch (error) {
    handleError(res, error, "updating address");
  }
};

// @desc    Delete address from supplier
exports.deleteAddress = async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

    const { addressId } = req.params;
    let currentAddresses = [...(supplier.addresses || [])];
    const newAddresses = currentAddresses.filter((a) => String(a.id || a._id) !== String(addressId));

    if (currentAddresses.length === newAddresses.length) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    await supplier.update({ addresses: newAddresses });
    res.status(200).json({ success: true, message: "Address deleted successfully", data: supplier });
  } catch (error) {
    handleError(res, error, "deleting address");
  }
};

// @desc    Get suppliers by type
exports.getSuppliersByType = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { type: req.params.type },
      order: [["supplierName", "ASC"]],
    });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error) {
    handleError(res, error, "fetching suppliers by type");
  }
};
