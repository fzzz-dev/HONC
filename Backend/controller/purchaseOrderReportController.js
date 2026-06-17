const PurchaseOrder = require("../models/PurchaseOrder");
const PurchaseOrderDetail = require("../models/PurchaseOrderDetail");
const sequelize = require("../config/database");

// Create Purchase Order
const createPurchaseOrder = async (req, res) => {
  try {
    const {
      poNo,
      date,
      supplierId,
      supplierName,
      deliveryDate,
      poType,
      gstEnabled,
      gstType,
      paymentTermsId,
      paymentTermsName,
      refNo,
      refDate,
      purchaseIndentId,
      purchaseIndentNo,
      remarks,
      details,
      grossAmount,
      discAmount,
      poAmount,
      igstAmount,
      cgstAmount,
      sgstAmount,
      netAmount,
      totalAmount,
      roundoff,
      totalItems,
      createdBy,
      level1Approved,
      level2Approved,
      transportCharges = 0  // ✅ ADDED - destructure transportCharges
    } = req.body;




    // Calculate final total with transport charges
    const finalTotalAmount = (Number(totalAmount) || 0) + (Number(transportCharges) || 0);
    const finalNetAmount = Math.round(finalTotalAmount);
    const finalRoundoff = +(finalTotalAmount - finalNetAmount).toFixed(2);

    const purchaseOrder = await PurchaseOrder.create({
      poNo,
      date,
      supplierId,
      supplierName,
      deliveryDate,
      poType,
      gstEnabled,
      gstType,
      paymentTermsId,
      paymentTermsName,
      refNo,
      refDate,
      purchaseIndentId,
      purchaseIndentNo,
      remarks,
      grossAmount,
      discAmount,
      poAmount,
      igstAmount,
      cgstAmount,
      sgstAmount,
      netAmount: finalNetAmount,  // ✅ Updated with transport
      totalAmount: finalTotalAmount,  // ✅ Updated with transport
      roundoff: finalRoundoff,  // ✅ Updated with transport
      totalItems,
      createdBy: createdBy || "Admin",
      status: "Open",
      level1Approved: level1Approved || "No",
      level2Approved: level2Approved || "No",
      transportCharges: transportCharges || 0  // ✅ ADDED - save transportCharges
    });

    // Create order details
    if (details && details.length > 0) {
      const orderDetails = details.map((item, index) => ({
        purchaseOrderId: purchaseOrder.id,
        lineNumber: index + 1,  // ✅ ADDED - preserve item order
        indentDetailId: item.indentDetailId,
        indentNo: item.indentNo,
        itemId: item.itemId,
        itemName: item.itemName,
        uom: item.uom,
        poQty: item.poQty,
        poRate: item.poRate,
        discMode: item.discMode,
        discPct: item.discPct,
        discPrice: item.discPrice,
        poAmount: item.poAmount,
        gstPct: item.gstPct,
        sgst: item.sgst,
        cgst: item.cgst,
        igst: item.igst,
        totGst: item.totGst,
        totalAmount: item.totalAmount,
        balQty: item.poQty,
        alGrnQty: 0
      }));
      
      await PurchaseOrderDetail.bulkCreate(orderDetails);
    }

    // Fetch the created PO with details
    const createdPO = await PurchaseOrder.findByPk(purchaseOrder.id, {
      include: [{
        model: PurchaseOrderDetail,
        as: 'details',
        order: [['lineNumber', 'ASC']]
      }]
    });

    res.json({
      success: true,
      data: createdPO,
      message: "Purchase Order created successfully"
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Purchase Order
const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      poNo,
      date,
      supplierId,
      supplierName,
      deliveryDate,
      poType,
      gstEnabled,
      gstType,
      paymentTermsId,
      paymentTermsName,
      refNo,
      refDate,
      purchaseIndentId,
      purchaseIndentNo,
      remarks,
      details,
      grossAmount,
      discAmount,
      poAmount,
      igstAmount,
      cgstAmount,
      sgstAmount,
      netAmount,
      totalAmount,
      roundoff,
      totalItems,
      status,
      level1Approved,
      level1ApprovedBy,
      level1ApprovedDate,
      level2Approved,
      level2ApprovedBy,
      level2ApprovedDate,
      transportCharges = 0  // ✅ ADDED - destructure transportCharges
    } = req.body;




    // Calculate final total with transport charges
    const finalTotalAmount = (Number(totalAmount) || 0) + (Number(transportCharges) || 0);
    const finalNetAmount = Math.round(finalTotalAmount);
    const finalRoundoff = +(finalTotalAmount - finalNetAmount).toFixed(2);

    // Build update object
    const updateData = {
      poNo,
      date,
      supplierId,
      supplierName,
      deliveryDate,
      poType,
      gstEnabled,
      gstType,
      paymentTermsId,
      paymentTermsName,
      refNo,
      refDate,
      purchaseIndentId,
      purchaseIndentNo,
      remarks,
      grossAmount,
      discAmount,
      poAmount,
      igstAmount,
      cgstAmount,
      sgstAmount,
      netAmount: finalNetAmount,  // ✅ Updated with transport
      totalAmount: finalTotalAmount,  // ✅ Updated with transport
      roundoff: finalRoundoff,  // ✅ Updated with transport
      totalItems,
      status,
      transportCharges: transportCharges || 0  // ✅ ADDED - save transportCharges
    };

    // Add approval fields if they exist
    if (level1Approved !== undefined) updateData.level1Approved = level1Approved;
    if (level1ApprovedBy !== undefined) updateData.level1ApprovedBy = level1ApprovedBy;
    if (level1ApprovedDate !== undefined) updateData.level1ApprovedDate = level1ApprovedDate;
    if (level2Approved !== undefined) updateData.level2Approved = level2Approved;
    if (level2ApprovedBy !== undefined) updateData.level2ApprovedBy = level2ApprovedBy;
    if (level2ApprovedDate !== undefined) updateData.level2ApprovedDate = level2ApprovedDate;

    // Update purchase order
    await PurchaseOrder.update(updateData, { where: { id } });

    // Update details if provided
    if (details && details.length > 0) {
      await PurchaseOrderDetail.destroy({ where: { purchaseOrderId: id } });
      
      const orderDetails = details.map((item, index) => ({
        purchaseOrderId: parseInt(id),
        lineNumber: index + 1,  // ✅ ADDED - preserve item order
        indentDetailId: item.indentDetailId,
        indentNo: item.indentNo,
        itemId: item.itemId,
        itemName: item.itemName,
        uom: item.uom,
        poQty: item.poQty,
        poRate: item.poRate,
        discMode: item.discMode,
        discPct: item.discPct,
        discPrice: item.discPrice,
        poAmount: item.poAmount,
        gstPct: item.gstPct,
        sgst: item.sgst,
        cgst: item.cgst,
        igst: item.igst,
        totGst: item.totGst,
        totalAmount: item.totalAmount,
        balQty: item.poQty,
        alGrnQty: 0
      }));
      
      await PurchaseOrderDetail.bulkCreate(orderDetails);
    }

    const updatedOrder = await PurchaseOrder.findByPk(id, {
      attributes: ['id', 'poNo', 'date', 'supplierId', 'supplierName', 'deliveryDate', 'poType',
                   'gstEnabled', 'gstType', 'paymentTermsId', 'paymentTermsName', 'refNo', 'refDate',
                   'purchaseIndentId', 'purchaseIndentNo', 'remarks', 'grossAmount', 'discAmount',
                   'poAmount', 'igstAmount', 'cgstAmount', 'sgstAmount', 'netAmount', 'totalAmount',
                   'roundoff', 'totalItems', 'createdBy', 'status', 'level1Approved', 'level1ApprovedBy',
                   'level1ApprovedDate', 'level2Approved', 'level2ApprovedBy', 'level2ApprovedDate',
                   'transportCharges', 'createdAt', 'updatedAt'],
      include: [{
        model: PurchaseOrderDetail,
        as: 'details',
        order: [['lineNumber', 'ASC']]
      }]
    });
    
    res.json({
      success: true,
      message: "Purchase Order updated successfully",
      data: updatedOrder
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all Purchase Orders
const getAllPurchaseOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        po.poNo AS ponumber,
        po.date AS podate,
        s.supplierName AS supplier,
        po.deliveryDate AS deliverydate,
        po.poType AS potype,
        po.transportCharges AS transportCharges,
        po.totalAmount AS totalAmount,
        po.status AS status,  
        pi.indentNo AS indentNo,
        i.itemName AS itemName,
        u.name AS uom,
        pod.poQty AS poQty,
        pod.poRate AS porate,
        pod.discPrice AS discPrice,
        pod.totGst AS totGst,
        pod.totalAmount AS itemTotalAmount,
        po.level1Approved AS level1Approved,
        po.level1ApprovedBy AS level1ApprovedBy,
        po.level1ApprovedDate AS level1ApprovedDate,
        po.level2Approved AS level2Approved,
        po.level2ApprovedBy AS level2ApprovedBy,
        po.level2ApprovedDate AS level2ApprovedDate
      FROM purchaseorders po
      LEFT JOIN purchaseorderdetails pod ON po.id = pod.purchaseOrderId
      LEFT JOIN suppliers s ON po.supplierId = s.id
      LEFT JOIN purchaseindents pi ON pod.indentNo = pi.indentNo
      LEFT JOIN items i ON pod.itemId = i.id
      LEFT JOIN uoms u ON pod.uom = u.name
      ORDER BY po.date DESC, po.poNo
    `;
    
    const [results] = await sequelize.query(query);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error in getAllPurchaseOrders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single Purchase Order - Using the view structure with filter
const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        po.poNo AS ponumber,
        po.date AS podate,
        s.supplierName AS supplier,
        po.deliveryDate AS deliverydate,
        po.poType AS potype,
        pi.indentNo AS indentNo,
        i.itemName AS itemName,
        u.name AS uom,
        pod.poQty AS poQty,
        pod.poRate AS porate,
        pod.discPrice AS discPrice,
        pod.totGst AS totGst,
        pod.totalAmount AS totalAmount,
        po.status AS status,
        po.level1Approved AS level1Approved,
        po.level1ApprovedBy AS level1ApprovedBy,
        po.level1ApprovedDate AS level1ApprovedDate,
        po.level2Approved AS level2Approved,
        po.level2ApprovedBy AS level2ApprovedBy,
        po.level2ApprovedDate AS level2ApprovedDate,
        po.id AS poId,
        po.supplierId,
        po.gstEnabled,
        po.gstType,
        po.paymentTermsId,
        po.paymentTermsName,
        po.refNo,
        po.refDate,
        po.purchaseIndentId,
        po.purchaseIndentNo,
        po.remarks,
        po.grossAmount,
        po.discAmount,
        po.poAmount,
        po.igstAmount,
        po.cgstAmount,
        po.sgstAmount,
        po.netAmount,
        po.totalAmount AS poTotalAmount,
        po.roundoff,
        po.totalItems,
        po.status,
        po.createdBy,
        po.createdAt,
        po.updatedAt,
        po.transportCharges AS transportCharges,
        pod.lineNumber
      FROM purchaseorders po
      LEFT JOIN purchaseorderdetails pod ON po.id = pod.purchaseOrderId
      LEFT JOIN suppliers s ON po.supplierId = s.id
      LEFT JOIN purchaseindents pi ON pod.indentNo = pi.indentNo
      LEFT JOIN items i ON pod.itemId = i.id
      LEFT JOIN uoms u ON pod.uom = u.name
      WHERE po.id = ?
      ORDER BY pod.lineNumber ASC, pod.id ASC
    `;
    
    const [results] = await sequelize.query(query, {
      replacements: [id]
    });
    
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase Order not found" });
    }
    
    // Group details under the main order
    const order = {
      id: results[0].poId,
      ponumber: results[0].ponumber,
      podate: results[0].podate,
      supplier: results[0].supplier,
      supplierId: results[0].supplierId,
      deliverydate: results[0].deliverydate,
      potype: results[0].potype,
      gstEnabled: results[0].gstEnabled,
      gstType: results[0].gstType,
      paymentTermsId: results[0].paymentTermsId,
      paymentTermsName: results[0].paymentTermsName,
      refNo: results[0].refNo,
      refDate: results[0].refDate,
      purchaseIndentId: results[0].purchaseIndentId,
      purchaseIndentNo: results[0].purchaseIndentNo,
      remarks: results[0].remarks,
      grossAmount: results[0].grossAmount,
      discAmount: results[0].discAmount,
      poAmount: results[0].poAmount,
      igstAmount: results[0].igstAmount,
      cgstAmount: results[0].cgstAmount,
      sgstAmount: results[0].sgstAmount,
      netAmount: results[0].netAmount,
      totalAmount: results[0].poTotalAmount,
      roundoff: results[0].roundoff,
      totalItems: results[0].totalItems,
      status: results[0].status,
      level1Approved: results[0].level1Approved,
      level1ApprovedBy: results[0].level1ApprovedBy,
      level1ApprovedDate: results[0].level1ApprovedDate,
      level2Approved: results[0].level2Approved,
      level2ApprovedBy: results[0].level2ApprovedBy,
      level2ApprovedDate: results[0].level2ApprovedDate,
      transportCharges: results[0].transportCharges || 0,
      createdBy: results[0].createdBy,
      createdAt: results[0].createdAt,
      updatedAt: results[0].updatedAt,
      details: results.map(row => ({
        indentNo: row.indentNo,
        itemName: row.itemName,
        uom: row.uom,
        poQty: row.poQty,
        poRate: row.porate,
        discPrice: row.discPrice,
        totGst: row.totGst,
        totalAmount: row.totalAmount,
        lineNumber: row.lineNumber
      }))
    };
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Purchase Order
const deletePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete details first
    await PurchaseOrderDetail.destroy({ where: { purchaseOrderId: id } });
    
    // Delete order
    await PurchaseOrder.destroy({ where: { id } });
    
    res.json({
      success: true,
      message: "Purchase Order deleted successfully"
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Get next PO number
const getNextPONumber = async (req, res) => {
  try {
    const lastOrder = await PurchaseOrder.findOne({
      order: [['id', 'DESC']],
      attributes: ['poNo']
    });
    
    let nextNumber = "PO-0001";
    if (lastOrder && lastOrder.poNo) {
      const match = lastOrder.poNo.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]) + 1;
        nextNumber = `PO-${num.toString().padStart(4, '0')}`;
      }
    }
    
    res.json({ success: true, poNo: nextNumber });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Purchase Order Result from view (direct view access)
const getPurchaseOrderResultView = async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT * FROM purchaseorderresult
      ORDER BY podate DESC, ponumber
    `);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPurchaseOrder,
  updatePurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  deletePurchaseOrder,
  getNextPONumber,
  getPurchaseOrderResultView
};  