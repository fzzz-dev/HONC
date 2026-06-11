const PurchaseGRN = require("../model/purchaseGRN");
const PurchaseGRNDetail = require("../model/purchaseGRNDetail");
const PurchaseOrder = require("../model/purchaseOrder");
const Item = require("../model/item");
const Supplier = require("../model/supplier");
const Store = require("../model/Store");
const { Op } = require("sequelize");

// Helper function to update PO status after GRN changes
async function updatePOStatusAfterGRNChange(poId) {
  try {
    const PurchaseOrder = require("../model/purchaseOrder");
    const PurchaseGRN = require("../model/purchaseGRN");
    
    const po = await PurchaseOrder.findByPk(poId, { include: ["details"] });
    if (!po || po.status === "Cancelled") return;
    
    const allGrns = await PurchaseGRN.findAll({
      where: { status: "Completed" },
      include: ["details"]
    });
    
    const receivedMap = new Map();
    allGrns.forEach((g) => {
      let gDetails = g.details;
      if (typeof gDetails === 'string') {
        try { gDetails = JSON.parse(gDetails); } catch (e) { gDetails = []; }
      }
      if (!Array.isArray(gDetails)) gDetails = [];
      
      gDetails.forEach((gd) => {
        if (gd && String(gd.poId) === String(poId)) {
          const key = gd.poDetailId || `item_${gd.itemId}`;
          const currentQty = receivedMap.get(key) || 0;
          receivedMap.set(key, currentQty + Number(gd.grnQty || 0));
        }
      });
    });
    
    let totalPoQty = 0;
    let totalReceivedQty = 0;
    const poDetails = po.details || [];
    
    poDetails.forEach((detail) => {
      const poQty = Number(detail.poQty || 0);
      totalPoQty += poQty;
      const detailId = detail.id || detail._id;
      const receivedQty = receivedMap.get(detailId) || 0;
      totalReceivedQty += receivedQty;
    });
    
    let newStatus = po.status;
    if (totalReceivedQty === 0) {
      newStatus = "Open";
    } else if (totalReceivedQty >= totalPoQty && totalPoQty > 0) {
      newStatus = "Closed";
    } else if (totalReceivedQty > 0 && totalReceivedQty < totalPoQty) {
      newStatus = "Partial";
    }
    
    if (newStatus !== po.status) {
      await po.update({ status: newStatus });
      console.log(`✅ PO ${po.poNo}: ${po.status} → ${newStatus}`);
    }
  } catch (error) {
    console.error("Error updating PO status:", error);
  }
}

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

    const grns = await PurchaseGRN.findAll({
      where: {
        status: { [Op.ne]: "Cancelled" }
      },
      include: ["details"]
    });
    
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
    const { grnNo, grnType, supplierId, storeId, invoiceNo, invoiceDate, vehicleNo, lrNo, transporterName, gstEnabled, gstType, status, remarks, details, createdBy, transportCharges = 0 } = req.body;
    const date = req.body.date || req.body.grnDate;

    if (!grnNo || !date || !supplierId) {
      return res.status(400).json({ success: false, message: "GRN No, Date, and Supplier are required" });
    }

    const existing = await PurchaseGRN.findOne({ where: { grnNo } });
    if (existing) {
      return res.status(400).json({ success: false, message: `GRN No ${grnNo} already exists` });
    }

    const cleanSupplierId = parseInt(String(supplierId).split(':')[0], 10);
    if (isNaN(cleanSupplierId)) {
      return res.status(400).json({ success: false, message: "Invalid Supplier ID format" });
    }

    const supplier = await Supplier.findByPk(cleanSupplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found in database" });
    }

    let storeName = "";
    let cleanStoreId = null;
    if (storeId) {
      cleanStoreId = !isNaN(parseInt(storeId, 10)) ? parseInt(storeId, 10) : null;
      if (cleanStoreId) {
        const store = await Store.findByPk(cleanStoreId);
        if (store) storeName = store.name;
      }
    }

    const processedDetails = (details || []).map((detail) => {
      const grnQty = Number(detail.grnQty || 0);
      const grnRate = Number(detail.grnRate || detail.poRate || 0);
      const discPct = Number(detail.discPct || 0);
      
      const grossAmount = grnQty * grnRate;
      const discAmount = grossAmount * (discPct / 100);
      const taxableAmount = grossAmount - discAmount;
      
      const gstPct = detail.gstPct !== undefined ? Number(detail.gstPct) : 0;
      let totGst = 0, sgst = 0, cgst = 0, igst = 0;
      
      if (gstEnabled !== false) {
        totGst = taxableAmount * (gstPct / 100);
        if (gstType === "local") {
          sgst = totGst / 2;
          cgst = totGst / 2;
        } else {
          igst = totGst;
        }
      }
      
      const totalAmount = taxableAmount + totGst;

      const { id, _rowId, createdAt, updatedAt, purchaseGRNId, poDetailId: oldPoDetailId, ...rest } = detail;
      
      const cleanPoId = detail.poId && !isNaN(parseInt(detail.poId, 10)) ? parseInt(detail.poId, 10) : null;
      const cleanItemId = detail.itemId && !isNaN(parseInt(detail.itemId, 10)) ? parseInt(detail.itemId, 10) : null;
      const rawPoDetailId = detail.poDetailId || detail.id || oldPoDetailId;
      const cleanPoDetailId = rawPoDetailId && !isNaN(parseInt(rawPoDetailId, 10)) ? parseInt(rawPoDetailId, 10) : null;

      return {
        ...rest,
        poId: cleanPoId,
        itemId: cleanItemId,
        poDetailId: cleanPoDetailId,
        poQty: Number(detail.poQty || 0),
        alGrnQty: Number(detail.alGrnQty || 0),
        balQty: Number(detail.balQty || 0),
        phyQty: Number(detail.phyQty || 0),
        batchQty: Number(detail.batchQty || 0),
        gstPct,
        grnQty,
        grnRate,
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        discAmount: parseFloat(discAmount.toFixed(2)),
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        sgst: parseFloat(sgst.toFixed(2)),
        cgst: parseFloat(cgst.toFixed(2)),
        igst: parseFloat(igst.toFixed(2)),
        totGst: parseFloat(totGst.toFixed(2)),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      };
    });

    let totalQty = 0;
    let totalAmount = 0;
    processedDetails.forEach(d => {
      totalQty += Number(d.grnQty || 0);
      totalAmount += Number(d.totalAmount || 0);
    });
    
    const transportAmt = Number(transportCharges) || 0;
    const transportGst = transportAmt > 0 ? transportAmt * 0.18 : 0;
    const finalTotalAmount = totalAmount + transportAmt + transportGst;

    const grn = await PurchaseGRN.create({
      grnNo, date, grnType: grnType || "Against PO", 
      supplierId: cleanSupplierId, supplierName: supplier.supplierName,
      storeId: cleanStoreId, storeName, 
      invoiceNo: invoiceNo || "", invoiceDate: invoiceDate || "",
      vehicleNo: vehicleNo || "", lrNo: lrNo || "", transporterName: transporterName || "",
      gstEnabled: gstEnabled !== false, gstType: gstType || "local",
      status: status || "Completed", remarks: remarks || "",
      totalQty, totalAmount: finalTotalAmount, totalItems: processedDetails.length,
      transportCharges: transportAmt,
      details: processedDetails, createdBy: createdBy || "Admin",
      createdOn: new Date().toISOString()
    }, { include: ["details"] });

    // ✅ Update PO status after GRN creation
    let affectedPoIds = new Set();
    processedDetails.forEach(d => {
      if (d.poId) affectedPoIds.add(d.poId);
    });
    
    for (const poId of affectedPoIds) {
      await updatePOStatusAfterGRNChange(poId);
    }

    res.status(201).json({ success: true, message: "GRN created successfully", data: grn });
  } catch (error) {
    console.error("CREATE GRN ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create GRN: " + error.message,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Update GRN
exports.updateGRN = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findByPk(req.params.id);
    if (!grn) return res.status(404).json({ success: false, message: "GRN not found" });
    if (grn.status === "Cancelled") return res.status(400).json({ success: false, message: "Cannot edit cancelled GRN" });

    const { grnType, supplierId, storeId, invoiceNo, invoiceDate, vehicleNo, lrNo, transporterName, gstEnabled, gstType, status, remarks, details, transportCharges } = req.body;
    const date = req.body.date || req.body.grnDate || grn.date;

    const updateData = { date, grnType, invoiceNo, invoiceDate, vehicleNo, lrNo, transporterName, gstEnabled, gstType, status, remarks };
    
    if (transportCharges !== undefined) {
      updateData.transportCharges = Number(transportCharges) || 0;
    }

    if (supplierId) {
      const cleanSupplierId = parseInt(String(supplierId).split(':')[0], 10);
      if (!isNaN(cleanSupplierId) && cleanSupplierId !== grn.supplierId) {
        const supplier = await Supplier.findByPk(cleanSupplierId);
        if (supplier) {
          updateData.supplierName = supplier.supplierName;
          updateData.supplierId = cleanSupplierId;
        }
      }
    }

    if (storeId !== undefined) {
      const cleanStoreId = storeId && !isNaN(parseInt(storeId, 10)) ? parseInt(storeId, 10) : null;
      if (cleanStoreId !== grn.storeId) {
        const store = cleanStoreId ? await Store.findByPk(cleanStoreId) : null;
        updateData.storeName = store ? store.name : "";
        updateData.storeId = cleanStoreId;
      }
    }

    // ✅ Track affected PO IDs
    let affectedPoIds = new Set();

    if (details) {
      // Filter out items with zero quantity
      const validDetails = (details || []).filter(detail => {
        const grnQty = Number(detail.grnQty || 0);
        return grnQty > 0 && detail.itemName;
      });

      const processedDetails = validDetails.map((detail) => {
        const grnQty = Number(detail.grnQty || 0);
        const grnRate = Number(detail.grnRate || detail.poRate || 0);
        const discPct = Number(detail.discPct || 0);
        
        const grossAmount = grnQty * grnRate;
        const discAmount = grossAmount * (discPct / 100);
        const taxableAmount = grossAmount - discAmount;
        
        const gstPct = detail.gstPct !== undefined ? Number(detail.gstPct) : 0;
        let totGst = 0, sgst = 0, cgst = 0, igst = 0;
        
        if (gstEnabled !== false) {
          totGst = taxableAmount * (gstPct / 100);
          if ((gstType || grn.gstType) === "local") {
            sgst = totGst / 2;
            cgst = totGst / 2;
          } else {
            igst = totGst;
          }
        }
        
        const totalAmount = taxableAmount + totGst;

        const { id, _rowId, createdAt, updatedAt, purchaseGRNId, poDetailId: oldPoDetailId, ...rest } = detail;

        const cleanPoId = detail.poId && !isNaN(parseInt(detail.poId, 10)) ? parseInt(detail.poId, 10) : null;
        const cleanItemId = detail.itemId && !isNaN(parseInt(detail.itemId, 10)) ? parseInt(detail.itemId, 10) : null;
        const rawPoDetailId = detail.poDetailId || detail.id || oldPoDetailId;
        const cleanPoDetailId = rawPoDetailId && !isNaN(parseInt(rawPoDetailId, 10)) ? parseInt(rawPoDetailId, 10) : null;

        // ✅ Collect affected PO IDs
        if (cleanPoId) affectedPoIds.add(cleanPoId);

        return {
          ...rest,
          purchaseGRNId: grn.id,
          poId: cleanPoId,
          itemId: cleanItemId,
          poDetailId: cleanPoDetailId,
          poQty: Number(detail.poQty || 0),
          alGrnQty: Number(detail.alGrnQty || 0),
          balQty: Number(detail.balQty || 0),
          phyQty: Number(detail.phyQty || 0),
          batchQty: Number(detail.batchQty || 0),
          gstPct,
          grnQty,
          grnRate,
          grossAmount: parseFloat(grossAmount.toFixed(2)),
          discAmount: parseFloat(discAmount.toFixed(2)),
          taxableAmount: parseFloat(taxableAmount.toFixed(2)),
          sgst: parseFloat(sgst.toFixed(2)),
          cgst: parseFloat(cgst.toFixed(2)),
          igst: parseFloat(igst.toFixed(2)),
          totGst: parseFloat(totGst.toFixed(2)),
          totalAmount: parseFloat(totalAmount.toFixed(2)),
        };
      });
      
      let totalQty = 0;
      let totalAmount = 0;
      processedDetails.forEach(d => {
        totalQty += Number(d.grnQty || 0);
        totalAmount += Number(d.totalAmount || 0);
      });
      
      const transportAmt = Number(transportCharges || updateData.transportCharges || grn.transportCharges || 0);
      const transportGst = transportAmt > 0 ? transportAmt * 0.18 : 0;
      const finalTotalAmount = totalAmount + transportAmt + transportGst;

      updateData.totalQty = totalQty;
      updateData.totalAmount = finalTotalAmount;
      updateData.totalItems = processedDetails.length;

      await grn.update(updateData);
      
      await PurchaseGRNDetail.destroy({ where: { purchaseGRNId: grn.id } });
      await PurchaseGRNDetail.bulkCreate(processedDetails);
      
      // ✅ Update PO status after all operations are complete
      for (const poId of affectedPoIds) {
        await updatePOStatusAfterGRNChange(poId);
      }
    } else {
      await grn.update(updateData);
    }

    const updatedGrn = await PurchaseGRN.findByPk(req.params.id, { include: ["details"] });
    res.json({ success: true, message: "GRN updated successfully", data: updatedGrn });

  } catch (error) {
    console.error("Update GRN error:", error);
    res.status(500).json({ success: false, message: "Failed to update GRN", error: error.message });
  }
};

// @desc    Delete GRN
exports.deleteGRN = async (req, res) => {
  try {
    const grn = await PurchaseGRN.findByPk(req.params.id);
    if (!grn) return res.status(404).json({ success: false, message: "GRN not found" });
    
    // Get affected PO IDs before deleting
    let affectedPoIds = new Set();
    let grnDetails = grn.details;
    if (typeof grnDetails === 'string') {
      try { grnDetails = JSON.parse(grnDetails); } catch (e) { grnDetails = []; }
    }
    if (Array.isArray(grnDetails)) {
      grnDetails.forEach(detail => {
        if (detail && detail.poId) {
          affectedPoIds.add(parseInt(detail.poId));
        }
      });
    }
    
    await grn.destroy();
    
    // Update PO status after deletion
    for (const poId of affectedPoIds) {
      await updatePOStatusAfterGRNChange(poId);
    }
    
    res.json({ success: true, message: "GRN deleted successfully" });
  } catch (error) {
    console.error("Delete GRN error:", error);
    res.status(500).json({ success: false, message: "Failed to delete GRN", error: error.message });
  }
};

// @desc    Get pending PO items for GRN creation
exports.getPendingPOItems = async (req, res) => {
  try {
    const { supplierId, poId } = req.query;

    const query = {
      status: {
        [Op.in]: ["Open", "Approved", "Partial", "Partially Received", "Issued", "Completed"]
      }
    };
    
    if (supplierId && String(supplierId).trim() !== "") {
      let cleanId = String(supplierId).trim();
      if (cleanId.includes(':')) {
        cleanId = cleanId.split(':')[0];
      }
      const parsedId = parseInt(cleanId, 10);
      if (!isNaN(parsedId)) {
        query.supplierId = parsedId;
      }
    }

    if (poId) {
      query.id = !isNaN(poId) ? parseInt(poId, 10) : poId;
    }

    const pos = await PurchaseOrder.findAll({
      where: query,
      include: ["details"],
      order: [["date", "DESC"]],
    });

    const allGrns = await PurchaseGRN.findAll({
      where: { status: "Completed" },
      include: ["details"]
    });

    const receivedMap = new Map();
    
    allGrns.forEach((grn) => {
      let grnDetails = grn.details;
      if (typeof grnDetails === 'string') {
        try { grnDetails = JSON.parse(grnDetails); } catch (e) { grnDetails = []; }
      }
      if (!Array.isArray(grnDetails)) grnDetails = [];

      grnDetails.forEach((gd) => {
        if (!gd || !gd.poId) return;
        
        if (gd.poDetailId) {
          const key = `${gd.poId}_${gd.poDetailId}`;
          const currentQty = receivedMap.get(key) || 0;
          receivedMap.set(key, currentQty + Number(gd.grnQty || 0));
        } else if (gd.itemId) {
          const key = `${gd.poId}_item_${gd.itemId}`;
          const currentQty = receivedMap.get(key) || 0;
          receivedMap.set(key, currentQty + Number(gd.grnQty || 0));
        } else if (gd.itemName) {
          const key = `${gd.poId}_name_${gd.itemName}`;
          const currentQty = receivedMap.get(key) || 0;
          receivedMap.set(key, currentQty + Number(gd.grnQty || 0));
        }
      });
    });

    const pendingItems = [];

    for (const po of pos) {
      let details = po.details;
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch (e) { details = []; }
      }
      if (!Array.isArray(details)) details = [];

      for (const detail of details) {
        if (!detail) continue;
        
        const poQty = Number(detail.poQty || 0);
        if (poQty <= 0) continue;
        
        const detailId = detail.id || detail._id;
        
        let alreadyReceived = 0;
        
        if (detailId) {
          const key = `${po.id}_${detailId}`;
          alreadyReceived = receivedMap.get(key) || 0;
        }
        
        if (alreadyReceived === 0 && detail.itemId) {
          const itemKey = `${po.id}_item_${detail.itemId}`;
          alreadyReceived = receivedMap.get(itemKey) || 0;
        }
        
        if (alreadyReceived === 0 && detail.itemName) {
          const nameKey = `${po.id}_name_${detail.itemName}`;
          alreadyReceived = receivedMap.get(nameKey) || 0;
        }

        const balanceQty = poQty - alreadyReceived;

        if (balanceQty > 0) {
          const rowId = `${po.id}-${detailId || Date.now()}`;
          pendingItems.push({
            rowId,
            poId: po.id,
            poNo: po.poNo,
            poDate: po.date,
            poDetailId: detailId || rowId,
            indentId: detail.indentId,
            indentNo: detail.indentNo || "",
            itemId: detail.itemId,
            itemName: detail.itemName,
            uom: detail.uom,
            poQty,
            alGrnQty: alreadyReceived,
            balQty: +balanceQty.toFixed(2),
            poRate: Number(detail.poRate || detail.rate || 0),
            gstPct: detail.gstPct !== undefined ? Number(detail.gstPct) : 0,
            gstType: po.gstType || "local",
            supplierId: po.supplierId,
            supplierName: po.supplierName,
          });
        }
      }
    }

    res.json(pendingItems);
  } catch (error) {
    console.error("Get pending PO items error:", error);
    res.status(500).json({ 
      success: false,
      message: `Failed to fetch pending PO items: ${error.message}`, 
      error: error.message
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