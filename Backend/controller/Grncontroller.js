const PurchaseGRN = require("../model/purchaseGRN");
const PurchaseGRNDetail = require("../model/purchaseGRNDetail");
const PurchaseOrder = require("../model/purchaseOrder");
const Item = require("../model/item");
const Supplier = require("../model/supplier");
const Store = require("../model/Store");
const { Op } = require("sequelize");

// @desc    Get all GRNs with optional filters
exports.getAllGRNs = async (req, res) => {
  try {
    const { status, supplierId, storeId, fromDate, toDate, search, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (storeId) where.storeId = storeId;

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date[Op.gte] = fromDate;
      if (toDate) where.date[Op.lte] = toDate;
    }

    if (search) {
      where[Op.or] = [
        { grnNo: { [Op.like]: `%${search}%` } },
        { invoiceNo: { [Op.like]: `%${search}%` } },
        { supplierName: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await PurchaseGRN.findAndCountAll({
      where,
      include: ["details"],
      offset: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit),
      order: [["date", "DESC"], ["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all GRNs error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch GRNs", error: error.message });
  }
};

// @desc    Get GRNs by Purchase Order
exports.getGRNsByPO = async (req, res) => {
  try {
    const { poId } = req.params;

    // Find all GRNs that reference this PO in their details JSON
    // Note: SQL JSON search. 
    const grns = await PurchaseGRN.findAll({
      where: {
        status: { [Op.ne]: "Cancelled" }
      },
      include: ["details"]
    });
    
    // Filter manually because JSON searching in Sequelize is dialect-dependent
    const filteredGrns = grns.filter(grn => 
      grn.details && grn.details.some(d => String(d.poId) === String(poId))
    );

    const po = await PurchaseOrder.findByPk(poId);
    if (!po) return res.status(404).json({ success: false, message: "Purchase Order not found" });

    const poSummary = {};
    filteredGrns.forEach((grn) => {
      grn.details.forEach((detail) => {
        if (String(detail.poId) === String(poId)) {
          const key = String(detail.itemId || detail.itemName);
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

    Object.keys(poSummary).forEach((key) => {
      poSummary[key].balQty = poSummary[key].poQty - poSummary[key].totalGrnQty;
    });

    res.json({ success: true, data: { po, grns: filteredGrns, summary: Object.values(poSummary) } });
  } catch (error) {
    console.error("Get GRNs by PO error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch GRNs for PO", error: error.message });
  }
};

// @desc    Get single GRN by ID
exports.getGRNById = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findByPk(req.params.id, {
      include: ["details"]
    });
    if (!grn) return res.status(404).json({ success: false, message: "GRN not found" });
    res.json({ success: true, data: grn });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch GRN", error: error.message });
  }
};

// @desc    Create new GRN
exports.createGRN = async (req, res) => {
  try {
    const { grnNo, date, grnType, supplierId, storeId, invoiceNo, invoiceDate, vehicleNo, lrNo, transporterName, gstEnabled, gstType, status, remarks, details, createdBy } = req.body;

    if (!grnNo || !date || !supplierId) return res.status(400).json({ success: false, message: "GRN No, Date, and Supplier are required" });

    const existing = await PurchaseGRN.findOne({ where: { grnNo } });
    if (existing) return res.status(400).json({ success: false, message: `GRN No ${grnNo} already exists` });

    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) return res.status(404).json({ success: false, message: "Supplier not found" });

    let storeName = "";
    if (storeId) {
      const store = await Store.findByPk(storeId);
      if (store) storeName = store.name;
    }

    const processedDetails = await Promise.all(details.map(async (detail) => {
      let itemName = detail.itemName;
      let uom = detail.uom;
      if (detail.itemId) {
        const item = await Item.findByPk(detail.itemId);
        if (item) { itemName = item.itemName; uom = item.uom; }
      }
      const grnAmount = detail.grnQty * detail.grnRate * (1 - (detail.discPct || 0) / 100);
      const gstPct = detail.gstPct !== undefined ? Number(detail.gstPct) : 0;
      const gst = grnAmount * (gstPct / 100);
      return {
        ...detail,
        itemName, uom,
        grnAmount: parseFloat(grnAmount.toFixed(2)),
        sgst: gstType === "local" ? parseFloat((gst / 2).toFixed(2)) : 0,
        cgst: gstType === "local" ? parseFloat((gst / 2).toFixed(2)) : 0,
        igst: gstType === "other" ? parseFloat(gst.toFixed(2)) : 0,
        totGst: parseFloat(gst.toFixed(2)),
        totalAmount: parseFloat((grnAmount + gst).toFixed(2)),
        id: detail.id || detail._id || Date.now() + Math.random()
      };
    }));

    let totalQty = 0;
    let totalAmount = 0;
    processedDetails.forEach(d => {
      totalQty += Number(d.grnQty || 0);
      totalAmount += Number(d.totalAmount || 0);
    });

    const grn = await PurchaseGRN.create({
      grnNo, date, grnType: grnType || "Against PO", supplierId, supplierName: supplier.supplierName,
      storeId: storeId || null, storeName, invoiceNo: invoiceNo || "", invoiceDate: invoiceDate || "",
      vehicleNo: vehicleNo || "", lrNo: lrNo || "", transporterName: transporterName || "",
      gstEnabled: gstEnabled !== false, gstType: gstType || "local",
      status: status || "Completed", remarks: remarks || "",
      totalQty, totalAmount, totalItems: processedDetails.length,
      details: processedDetails, createdBy: createdBy || "Admin",
      createdOn: new Date().toISOString()
    }, { include: ["details"] });

    res.status(201).json({ success: true, message: "GRN created successfully", data: grn });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create GRN", error: error.message });
  }
};

// @desc    Update GRN
exports.updateGRN = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findByPk(req.params.id);
    if (!grn) return res.status(404).json({ success: false, message: "GRN not found" });
    if (grn.status === "Cancelled") return res.status(400).json({ success: false, message: "Cannot edit cancelled GRN" });

    const { date, grnType, supplierId, storeId, invoiceNo, invoiceDate, vehicleNo, lrNo, transporterName, gstEnabled, gstType, status, remarks, details } = req.body;

    const updateData = { date, grnType, supplierId, storeId, invoiceNo, invoiceDate, vehicleNo, lrNo, transporterName, gstEnabled, gstType, status, remarks };

    if (supplierId && supplierId !== grn.supplierId) {
      const supplier = await Supplier.findByPk(supplierId);
      if (supplier) updateData.supplierName = supplier.supplierName;
    }

    if (storeId !== undefined && storeId !== grn.storeId) {
      const store = await Store.findByPk(storeId);
      updateData.storeName = store ? store.name : "";
      updateData.storeId = storeId || null;
    }

    if (details) {
      updateData.details = await Promise.all(details.map(async (detail) => {
        const grnAmount = detail.grnQty * detail.grnRate * (1 - (detail.discPct || 0) / 100);
        const gstPct = detail.gstPct !== undefined ? Number(detail.gstPct) : 0;
        const gst = grnAmount * (gstPct / 100);
        return {
          ...detail,
          grnAmount: parseFloat(grnAmount.toFixed(2)),
          sgst: (gstType || grn.gstType) === "local" ? parseFloat((gst / 2).toFixed(2)) : 0,
          cgst: (gstType || grn.gstType) === "local" ? parseFloat((gst / 2).toFixed(2)) : 0,
          igst: (gstType || grn.gstType) === "other" ? parseFloat(gst.toFixed(2)) : 0,
          totGst: parseFloat(gst.toFixed(2)),
          totalAmount: parseFloat((grnAmount + gst).toFixed(2)),
        };
      }));
      
      let totalQty = 0;
      let totalAmount = 0;
      updateData.details.forEach(d => {
        totalQty += Number(d.grnQty || 0);
        totalAmount += Number(d.totalAmount || 0);
      });
      updateData.totalQty = totalQty;
      updateData.totalAmount = totalAmount;
      updateData.totalItems = updateData.details.length;
    }

    await grn.update(updateData);
    
    if (updateData.details) {
      await PurchaseGRNDetail.destroy({ where: { purchaseGRNId: grn.id } });
      const detailsToCreate = updateData.details.map(d => {
        const { id, _id, ...rest } = d;
        return { ...rest, purchaseGRNId: grn.id };
      });
      if (detailsToCreate.length > 0) {
        await PurchaseGRNDetail.bulkCreate(detailsToCreate);
      }
    }
    
    const updatedGrn = await PurchaseGRN.findByPk(req.params.id, { include: ["details"] });
    res.json({ success: true, message: "GRN updated successfully", data: updatedGrn });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update GRN", error: error.message });
  }
};

// @desc    Delete GRN
exports.deleteGRN = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findByPk(req.params.id);
    if (!grn) return res.status(404).json({ success: false, message: "GRN not found" });
    await grn.destroy();
    res.json({ success: true, message: "GRN deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete GRN", error: error.message });
  }
};

// @desc    Get pending PO items for GRN creation
exports.getPendingPOItems = async (req, res) => {
  try {
    const { supplierId, poId } = req.query;
    console.log("Fetching pending PO items for:", { supplierId, poId });

    const query = { status: "Open" };
    let querySupplierId = supplierId;
    if (typeof supplierId === 'string' && supplierId.includes(':')) {
      querySupplierId = supplierId.split(':')[0];
    }
    
    // Convert to number if possible to avoid database type mismatch errors
    if (querySupplierId && !isNaN(querySupplierId)) {
      query.supplierId = parseInt(querySupplierId, 10);
    } else if (querySupplierId) {
      query.supplierId = querySupplierId;
    }

    if (poId && !isNaN(poId)) {
      query.id = parseInt(poId, 10);
    } else if (poId) {
      query.id = poId;
    }

    const pos = await PurchaseOrder.findAll({
      where: query,
      include: ["details"],
      order: [["date", "DESC"]],
    });

    const allGrns = await PurchaseGRN.findAll({
      where: { status: { [Op.ne]: "Cancelled" } },
      include: ["details"]
    });

    // Pass 1: Build a map of received quantities to avoid nested loops
    const receivedMap = {}; 
    allGrns.forEach((grn) => {
      if (!grn) return;
      let grnDetails = grn.details;
      if (typeof grnDetails === 'string') {
        try { grnDetails = JSON.parse(grnDetails); } catch (e) { grnDetails = []; }
      }
      if (!Array.isArray(grnDetails)) grnDetails = [];

      grnDetails.forEach((gd) => {
        if (!gd || !gd.poId) return;
        // Map by PO ID + Item ID (or name as fallback)
        const itemKey = gd.itemId || gd.itemName;
        if (!itemKey) return;
        
        const key = `${gd.poId}-${itemKey}`;
        receivedMap[key] = (receivedMap[key] || 0) + Number(gd.grnQty || 0);
      });
    });

    const pendingItems = [];

    // Pass 2: Calculate balances for each PO item
    for (const po of pos) {
      let details = po.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch (e) { details = []; }
      }
      if (!Array.isArray(details)) details = [];

      for (const detail of details) {
        if (!detail) continue;
        
        const itemKey = detail.itemId || detail.itemName || "unknown";
        const key = `${po.id}-${itemKey}`;
        const alreadyReceived = receivedMap[key] || 0;
        const balanceQty = Number(detail.poQty || 0) - alreadyReceived;

        if (balanceQty > 0) {
          pendingItems.push({
            poId: po.id,
            poNo: po.poNo,
            poDate: po.date,
            poDetailId: detail.id || detail._id || `tmp-${Math.random()}`,
            indentId: detail.indentId,
            indentNo: detail.indentNo,
            itemId: detail.itemId,
            itemName: detail.itemName,
            uom: detail.uom,
            poQty: Number(detail.poQty || 0),
            alGrnQty: alreadyReceived,
            balQty: balanceQty,
            poRate: Number(detail.poRate || detail.rate || 0),
            gstPct: detail.gstPct !== undefined ? Number(detail.gstPct) : 0,
            gstType: po.gstType || "local",
            supplierId: po.supplierId,
            supplierName: po.supplierName,
          });
        }
      }
    }

    res.json({ success: true, data: pendingItems });
  } catch (error) {
    console.error("Get pending PO items error:", error);
    res.status(500).json({ 
      success: false,
      message: `Failed to fetch pending PO items: ${error.message}`, 
      error: error.message,
      stack: error.stack
    });
  }
};

// @desc    Get items nearing expiry
exports.getExpiringItems = async (req, res) => {
  try {
    const { days = 90, storeId } = req.query;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + parseInt(days));

    const todayStr = today.toISOString().split("T")[0];
    const futureDateStr = futureDate.toISOString().split("T")[0];

    const grns = await PurchaseGRN.findAll({
      where: {
        status: "Completed",
        storeId: storeId || { [Op.ne]: null }
      },
      include: ["details"]
    });

    const expiringItems = [];

    grns.forEach((grn) => {
      const details = grn.details || [];
      details.forEach((detail) => {
        if (detail.expiryDate && detail.expiryDate >= todayStr && detail.expiryDate <= futureDateStr) {
          const expiryDate = new Date(detail.expiryDate);
          const daysToExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

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

    expiringItems.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
    res.json({ success: true, data: expiringItems });
  } catch (error) {
    console.error("Get expiring items error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch expiring items", error: error.message });
  }
};

function getFinancialYear() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  if (month < 4) return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
  return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
}

// @desc    Get next GRN number
exports.getNextGRNNumber = async (req, res) => {
  try {
    const fy = getFinancialYear();
    const prefix = "GRN/";
    const latestGRN = await PurchaseGRN.findOne({
      where: { grnNo: { [Op.like]: `${prefix}%/${fy}` } },
      order: [["grnNo", "DESC"]]
    });

    let nextNumber = 1;
    if (latestGRN) {
      const parts = latestGRN.grnNo.split("/");
      if (parts.length === 3) {
        nextNumber = parseInt(parts[1], 10) + 1;
      }
    }
    const nextGRNNo = `${prefix}${String(nextNumber).padStart(4, "0")}/${fy}`;
    res.json({ success: true, data: { nextGRNNo } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to generate GRN number", error: error.message });
  }
};