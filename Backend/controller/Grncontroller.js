const PurchaseGRN = require("../model/purchaseGRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Item = require("../models/Item");
const Supplier = require("../models/Supplier");
const Store = require("../models/Store");

/**
 * @desc    Get all GRNs with optional filters
 * @route   GET /api/grn
 * @access  Private
 */
exports.getAllGRNs = async (req, res) => {
  try {
    const {
      status,
      supplierId,
      storeId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    // Filters
    if (status) query.status = status;
    if (supplierId) query.supplierId = supplierId;
    if (storeId) query.storeId = storeId;

    // Date range
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }

    // Search by GRN No, Invoice No, or Supplier Name
    if (search) {
      query.$or = [
        { grnNo: { $regex: search, $options: "i" } },
        { invoiceNo: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const grns = await PurchaseGRN.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("supplierId", "supplierName contactPerson phone")
      .populate("storeId", "name location")
      .lean();

    const total = await PurchaseGRN.countDocuments(query);

    res.json({
      success: true,
      data: grns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all GRNs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GRNs",
      error: error.message,
    });
  }
};

/**
 * @desc    Get GRNs by Purchase Order
 * @route   GET /api/grn/by-po/:poId
 * @access  Private
 */
exports.getGRNsByPO = async (req, res) => {
  try {
    const { poId } = req.params;

    // Find all GRNs that reference this PO
    const grns = await PurchaseGRN.find({
      "details.poId": poId,
      status: { $ne: "Cancelled" },
    })
      .sort({ date: -1 })
      .populate("supplierId", "supplierName")
      .populate("storeId", "name")
      .lean();

    // Get the PO for reference
    const po = await PurchaseOrder.findById(poId)
      .select("poNo date supplierName status")
      .lean();

    if (!po) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    // Calculate summary for each PO detail item
    const poSummary = {};
    grns.forEach((grn) => {
      grn.details.forEach((detail) => {
        if (detail.poId?.toString() === poId) {
          const key = detail.itemId?.toString() || detail.itemName;
          if (!poSummary[key]) {
            poSummary[key] = {
              itemId: detail.itemId,
              itemName: detail.itemName,
              uom: detail.uom,
              poQty: detail.poQty,
              totalGrnQty: 0,
              balQty: 0,
              grns: [],
            };
          }
          poSummary[key].totalGrnQty += detail.grnQty;
          poSummary[key].grns.push({
            grnNo: grn.grnNo,
            grnDate: grn.date,
            grnQty: detail.grnQty,
            grnRate: detail.grnRate,
            totalAmount: detail.totalAmount,
          });
        }
      });
    });

    // Calculate balance
    Object.keys(poSummary).forEach((key) => {
      poSummary[key].balQty =
        poSummary[key].poQty - poSummary[key].totalGrnQty;
    });

    res.json({
      success: true,
      data: {
        po,
        grns,
        summary: Object.values(poSummary),
      },
    });
  } catch (error) {
    console.error("Get GRNs by PO error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GRNs for PO",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single GRN by ID
 * @route   GET /api/grn/:id
 * @access  Private
 */
exports.getGRNById = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findById(req.params.id)
      .populate("supplierId", "supplierName contactPerson phone email address")
      .populate("storeId", "name location type")
      .lean();

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    res.json({
      success: true,
      data: grn,
    });
  } catch (error) {
    console.error("Get GRN by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch GRN",
      error: error.message,
    });
  }
};

/**
 * @desc    Create new GRN
 * @route   POST /api/grn
 * @access  Private
 */
exports.createGRN = async (req, res) => {
  try {
    const {
      grnNo,
      date,
      supplierId,
      storeId,
      invoiceNo,
      invoiceDate,
      vehicleNo,
      lrNo,
      transporterName,
      gstEnabled,
      gstType,
      status,
      remarks,
      details,
      createdBy,
    } = req.body;

    // Validation
    if (!grnNo || !date || !supplierId) {
      return res.status(400).json({
        success: false,
        message: "GRN No, Date, and Supplier are required",
      });
    }

    if (!details || details.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one detail line is required",
      });
    }

    // Check for duplicate GRN No
    const existing = await PurchaseGRN.findOne({ grnNo });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `GRN No ${grnNo} already exists`,
      });
    }

    // Get supplier name
    const supplier = await Supplier.findById(supplierId).lean();
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Get store name if provided
    let storeName = "";
    if (storeId) {
      const store = await Store.findById(storeId).lean();
      if (store) storeName = store.name;
    }

    // Process details: fetch item info, validate, calculate amounts
    const processedDetails = await Promise.all(
      details.map(async (detail) => {
        let itemInfo = { itemName: detail.itemName, uom: detail.uom };

        if (detail.itemId) {
          const item = await Item.findById(detail.itemId).lean();
          if (item) {
            itemInfo = { itemName: item.itemName, uom: item.uom };
          }
        }

        // Calculate amounts
        const grnAmount =
          detail.grnQty *
          detail.grnRate *
          (1 - (detail.discPct || 0) / 100);
        const gst = grnAmount * ((detail.gstPct || 18) / 100);

        return {
          ...detail,
          itemName: itemInfo.itemName,
          uom: itemInfo.uom,
          grnAmount: parseFloat(grnAmount.toFixed(2)),
          sgst: gstType === "local" ? parseFloat((gst / 2).toFixed(2)) : 0,
          cgst: gstType === "local" ? parseFloat((gst / 2).toFixed(2)) : 0,
          igst: gstType === "other" ? parseFloat(gst.toFixed(2)) : 0,
          totGst: parseFloat(gst.toFixed(2)),
          totalAmount: parseFloat((grnAmount + gst).toFixed(2)),
        };
      })
    );

    // Create GRN
    const grn = await PurchaseGRN.create({
      grnNo,
      date,
      supplierId,
      supplierName: supplier.supplierName,
      storeId: storeId || null,
      storeName,
      invoiceNo: invoiceNo || "",
      invoiceDate: invoiceDate || "",
      vehicleNo: vehicleNo || "",
      lrNo: lrNo || "",
      transporterName: transporterName || "",
      gstEnabled: gstEnabled !== false,
      gstType: gstType || "local",
      status: status || "Completed",
      remarks: remarks || "",
      details: processedDetails,
      createdBy: createdBy || "Admin",
      createdOn: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: "GRN created successfully",
      data: grn,
    });
  } catch (error) {
    console.error("Create GRN error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create GRN",
      error: error.message,
    });
  }
};

/**
 * @desc    Update GRN
 * @route   PUT /api/grn/:id
 * @access  Private
 */
exports.updateGRN = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findById(req.params.id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    // Don't allow editing Cancelled GRNs
    if (grn.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot edit cancelled GRN",
      });
    }

    const {
      date,
      supplierId,
      storeId,
      invoiceNo,
      invoiceDate,
      vehicleNo,
      lrNo,
      transporterName,
      gstEnabled,
      gstType,
      status,
      remarks,
      details,
    } = req.body;

    // Update supplier name if changed
    if (supplierId && supplierId !== grn.supplierId?.toString()) {
      const supplier = await Supplier.findById(supplierId).lean();
      if (supplier) {
        grn.supplierName = supplier.supplierName;
      }
    }

    // Update store name if changed
    if (storeId && storeId !== grn.storeId?.toString()) {
      const store = await Store.findById(storeId).lean();
      if (store) {
        grn.storeName = store.name;
      }
    }

    // Process details if provided
    if (details) {
      const processedDetails = await Promise.all(
        details.map(async (detail) => {
          let itemInfo = { itemName: detail.itemName, uom: detail.uom };

          if (detail.itemId) {
            const item = await Item.findById(detail.itemId).lean();
            if (item) {
              itemInfo = { itemName: item.itemName, uom: item.uom };
            }
          }

          const grnAmount =
            detail.grnQty *
            detail.grnRate *
            (1 - (detail.discPct || 0) / 100);
          const gst = grnAmount * ((detail.gstPct || 18) / 100);

          return {
            ...detail,
            itemName: itemInfo.itemName,
            uom: itemInfo.uom,
            grnAmount: parseFloat(grnAmount.toFixed(2)),
            sgst:
              (gstType || grn.gstType) === "local"
                ? parseFloat((gst / 2).toFixed(2))
                : 0,
            cgst:
              (gstType || grn.gstType) === "local"
                ? parseFloat((gst / 2).toFixed(2))
                : 0,
            igst:
              (gstType || grn.gstType) === "other"
                ? parseFloat(gst.toFixed(2))
                : 0,
            totGst: parseFloat(gst.toFixed(2)),
            totalAmount: parseFloat((grnAmount + gst).toFixed(2)),
          };
        })
      );
      grn.details = processedDetails;
    }

    // Update other fields
    if (date) grn.date = date;
    if (supplierId) grn.supplierId = supplierId;
    if (storeId !== undefined) grn.storeId = storeId || null;
    if (invoiceNo !== undefined) grn.invoiceNo = invoiceNo;
    if (invoiceDate !== undefined) grn.invoiceDate = invoiceDate;
    if (vehicleNo !== undefined) grn.vehicleNo = vehicleNo;
    if (lrNo !== undefined) grn.lrNo = lrNo;
    if (transporterName !== undefined) grn.transporterName = transporterName;
    if (gstEnabled !== undefined) grn.gstEnabled = gstEnabled;
    if (gstType) grn.gstType = gstType;
    if (status) grn.status = status;
    if (remarks !== undefined) grn.remarks = remarks;

    await grn.save();

    res.json({
      success: true,
      message: "GRN updated successfully",
      data: grn,
    });
  } catch (error) {
    console.error("Update GRN error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update GRN",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete GRN
 * @route   DELETE /api/grn/:id
 * @access  Private
 */
exports.deleteGRN = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findById(req.params.id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    await PurchaseGRN.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "GRN deleted successfully",
    });
  } catch (error) {
    console.error("Delete GRN error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete GRN",
      error: error.message,
    });
  }
};

/**
 * @desc    Get pending PO items for GRN creation
 * @route   GET /api/grn/pending-po-items
 * @access  Private
 */
exports.getPendingPOItems = async (req, res) => {
  try {
    const { supplierId, poId } = req.query;

    const query = { status: "Open" };
    if (supplierId) query.supplierId = supplierId;
    if (poId) query._id = poId;

    const pos = await PurchaseOrder.find(query)
      .sort({ date: -1 })
      .lean();

    // For each PO, calculate pending quantities
    const pendingItems = [];

    for (const po of pos) {
      for (const detail of po.details) {
        // Calculate already received quantity from all GRNs
        const grns = await PurchaseGRN.find({
          "details.poId": po._id,
          "details.itemId": detail.itemId,
          status: { $ne: "Cancelled" },
        }).lean();

        let alreadyReceived = 0;
        grns.forEach((grn) => {
          grn.details.forEach((grnDetail) => {
            if (
              grnDetail.poId?.toString() === po._id.toString() &&
              grnDetail.itemId?.toString() === detail.itemId?.toString()
            ) {
              alreadyReceived += grnDetail.grnQty;
            }
          });
        });

        const balanceQty = detail.poQty - alreadyReceived;

        if (balanceQty > 0) {
          pendingItems.push({
            poId: po._id,
            poNo: po.poNo,
            poDate: po.date,
            poDetailId: detail._id,
            indentId: detail.indentId,
            indentNo: detail.indentNo,
            itemId: detail.itemId,
            itemName: detail.itemName,
            uom: detail.uom,
            poQty: detail.poQty,
            alGrnQty: alreadyReceived,
            balQty: balanceQty,
            poRate: detail.poRate,
            gstPct: detail.gstPct,
            supplierId: po.supplierId,
            supplierName: po.supplierName,
          });
        }
      }
    }

    res.json({
      success: true,
      data: pendingItems,
    });
  } catch (error) {
    console.error("Get pending PO items error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending PO items",
      error: error.message,
    });
  }
};

/**
 * @desc    Get items nearing expiry
 * @route   GET /api/grn/expiring-items
 * @access  Private
 */
exports.getExpiringItems = async (req, res) => {
  try {
    const { days = 90, storeId } = req.query;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    const todayStr = today.toISOString().split("T")[0];
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const query = {
      status: "Completed",
      "details.expiryDate": {
        $gte: todayStr,
        $lte: futureDateStr,
      },
    };

    if (storeId) query.storeId = storeId;

    const grns = await PurchaseGRN.find(query)
      .populate("storeId", "name")
      .lean();

    const expiringItems = [];

    grns.forEach((grn) => {
      grn.details.forEach((detail) => {
        if (detail.expiryDate && detail.expiryDate >= todayStr && detail.expiryDate <= futureDateStr) {
          const expiryDate = new Date(detail.expiryDate);
          const daysToExpiry = Math.ceil(
            (expiryDate - today) / (1000 * 60 * 60 * 24)
          );

          expiringItems.push({
            grnNo: grn.grnNo,
            grnDate: grn.date,
            itemName: detail.itemName,
            batchNo: detail.batchNo,
            expiryDate: detail.expiryDate,
            daysToExpiry,
            grnQty: detail.grnQty,
            uom: detail.uom,
            storeName: grn.storeName,
            storeId: grn.storeId,
          });
        }
      });
    });

    // Sort by days to expiry
    expiringItems.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

    res.json({
      success: true,
      data: expiringItems,
    });
  } catch (error) {
    console.error("Get expiring items error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expiring items",
      error: error.message,
    });
  }
};

/**
 * @desc    Generate next GRN number
 * @route   GET /api/grn/next-number
 * @access  Private
 */
exports.getNextGRNNumber = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const prefix = `GRN-${year}-`;

    const latestGRN = await PurchaseGRN.findOne({
      grnNo: { $regex: `^${prefix}` },
    })
      .sort({ grnNo: -1 })
      .lean();

    let nextNumber = 1;

    if (latestGRN) {
      const match = latestGRN.grnNo.match(/^GRN-\d{4}-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    const nextGRNNo = `${prefix}${String(nextNumber).padStart(3, "0")}`;

    res.json({
      success: true,
      data: { nextGRNNo },
    });
  } catch (error) {
    console.error("Get next GRN number error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate GRN number",
      error: error.message,
    });
  }
};