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
      createdBy
    } = req.body;

    console.log("Creating PO with deliveryDate:", deliveryDate);

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
      netAmount,
      totalAmount,
      roundoff,
      totalItems,
      createdBy: createdBy || "Admin",
      status: "Open"
    });

    // Create order details
    if (details && details.length > 0) {
      const orderDetails = details.map(item => ({
        purchaseOrderId: purchaseOrder.id,
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

    res.json({
      success: true,
      data: purchaseOrder,
      message: "Purchase Order created successfully"
    });
  } catch (error) {
    console.error("Error creating purchase order:", error);
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
      status
    } = req.body;

    console.log("Updating PO ID:", id, "with deliveryDate:", deliveryDate);

    // Update purchase order
    await PurchaseOrder.update({
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
      netAmount,
      totalAmount,
      roundoff,
      totalItems,
      status
    }, { where: { id } });

    // Update details if provided
    if (details && details.length > 0) {
      await PurchaseOrderDetail.destroy({ where: { purchaseOrderId: id } });
      
      const orderDetails = details.map(item => ({
        purchaseOrderId: id,
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

    const updatedOrder = await PurchaseOrder.findByPk(id);
    
    res.json({
      success: true,
      message: "Purchase Order updated successfully",
      data: updatedOrder
    });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all Purchase Orders
const getAllPurchaseOrders = async (req, res) => {
  try {
    const orders = await PurchaseOrder.findAll({
      order: [['createdAt', 'DESC']],
      include: [{
        model: PurchaseOrderDetail,
        as: 'details'
      }]
    });
    
    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single Purchase Order
const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await PurchaseOrder.findByPk(id, {
      include: [{
        model: PurchaseOrderDetail,
        as: 'details'
      }]
    });
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Purchase Order not found" });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("Error fetching purchase order:", error);
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
    console.error("Error deleting purchase order:", error);
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
    console.error("Error generating PO number:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createPurchaseOrder,
  updatePurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  deletePurchaseOrder,
  getNextPONumber
};