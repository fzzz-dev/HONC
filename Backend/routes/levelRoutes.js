const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Level routes are working!' });
});

// GET - Level 2 pending POs (Simple)
router.get('/level2-pending', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        id,
        poNo,
        date,
        supplierId,
        supplierName,
        deliveryDate,
        poType,
        level1Approved,
        level2Approved,
        level1ApprovedBy,
        level1ApprovedDate,
        level2ApprovedBy,
        level2ApprovedDate,
        status,
        createdBy,
        createdOn,
        totalAmount
      FROM PurchaseOrders 
      WHERE level2Approved = 'No' 
      AND status != 'Closed'
      ORDER BY date DESC, id DESC
    `);
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Level 1 pending POs (Simple)
router.get('/level1-pending', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        id,
        poNo,
        date,
        supplierId,
        supplierName,
        deliveryDate,
        poType,
        level1Approved,
        level2Approved,
        level1ApprovedBy,
        level1ApprovedDate,
        level2ApprovedBy,
        level2ApprovedDate,
        status,
        createdBy,
        createdOn,
        totalAmount
      FROM PurchaseOrders 
      WHERE level2Approved = 'Yes' 
      AND level1Approved = 'No'
      AND status != 'Closed'
      ORDER BY date DESC, id DESC
    `);
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - PO Items
router.get('/po-items/:poId', async (req, res) => {
  try {
    const { poId } = req.params;
    
    const [results] = await sequelize.query(`
      SELECT 
        id,
        indentNo,
        itemId,
        itemName,
        uom,
        poQty,
        poRate,
        poAmount,
        discPrice,
        discPct,
        gstPct,
        sgst,
        cgst,
        igst,
        totGst,
        totalAmount
      FROM PurchaseOrderDetails 
      WHERE purchaseOrderId = ?
      ORDER BY id
    `, {
      replacements: [poId]
    });
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve Level 2
router.put('/approve-level2/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    await sequelize.query(
      `UPDATE PurchaseOrders 
       SET level2Approved = 'Yes', 
           level2ApprovedBy = ?,
           level2ApprovedDate = NOW()
       WHERE id = ? AND level2Approved = 'No'`,
      {
        replacements: [approvedBy || 'System', id],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    res.json({ success: true, message: 'Level 2 approved successfully' });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve Level 1
router.put('/approve-level1/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    await sequelize.query(
      `UPDATE PurchaseOrders 
       SET level1Approved = 'Yes', 
           level1ApprovedBy = ?,
           level1ApprovedDate = NOW(),
           status = 'Approved'
       WHERE id = ? AND level2Approved = 'Yes' AND level1Approved = 'No'`,
      {
        replacements: [approvedBy || 'System', id],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    res.json({ success: true, message: 'PO fully approved!' });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk Approve Level 2
router.post('/bulk-approve-level2', async (req, res) => {
  try {
    const { poIds, approvedBy } = req.body;
    
    if (!poIds || poIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No PO IDs provided' });
    }
    
    const placeholders = poIds.map(() => '?').join(',');
    
    await sequelize.query(
      `UPDATE PurchaseOrders 
       SET level2Approved = 'Yes', 
           level2ApprovedBy = ?,
           level2ApprovedDate = NOW()
       WHERE id IN (${placeholders}) AND level2Approved = 'No'`,
      {
        replacements: [approvedBy || 'System', ...poIds],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    res.json({ success: true, message: `${poIds.length} PO(s) approved at Level 2` });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk Approve Level 1
router.post('/bulk-approve-level1', async (req, res) => {
  try {
    const { poIds, approvedBy } = req.body;
    
    if (!poIds || poIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No PO IDs provided' });
    }
    
    const placeholders = poIds.map(() => '?').join(',');
    
    await sequelize.query(
      `UPDATE PurchaseOrders 
       SET level1Approved = 'Yes', 
           level1ApprovedBy = ?,
           level1ApprovedDate = NOW(),
           status = 'Approved'
       WHERE id IN (${placeholders}) AND level2Approved = 'Yes' AND level1Approved = 'No'`,
      {
        replacements: [approvedBy || 'System', ...poIds],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    res.json({ success: true, message: `${poIds.length} PO(s) fully approved!` });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;