const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

router.get('/test', (req, res) => {
  res.json({ message: 'Reports API is working!' });
});

// ==================== PURCHASE INDENT REPORT ====================
router.get('/purchase-indent-report', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchIndentNo, category, status, departmentId } = req.query;
    
    let query = `
      SELECT 
        a.indentno, 
        a.date, 
        b.name AS deptname, 
        d.groupName, 
        e.itemDescription, 
        c.remarks,
        a.totalqty, 
        a.totalitems, 
        c.indentQty,
        c.uom,
        c.dueDate,
        a.status,
        a.createdBy
      FROM purchaseindents a 
      JOIN departments b ON a.departmentid = b.id 
      JOIN purchaseindentdetails c ON a.id = c.purchaseIndentId 
      JOIN maincategories d ON c.mainCategoryId = d.id 
      JOIN items e ON c.itemId = e.id 
    `;
    
    const whereConditions = [];
    const replacements = {};
    
    if (fromDate) {
      whereConditions.push(`a.date >= :fromDate`);
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      whereConditions.push(`a.date <= :toDate`);
      replacements.toDate = toDate;
    }
    
    if (searchTerm) {
      whereConditions.push(`e.itemDescription LIKE :searchTerm`);
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (searchIndentNo) {
      whereConditions.push(`a.indentno LIKE :searchIndentNo`);
      replacements.searchIndentNo = `%${searchIndentNo}%`;
    }
    
    if (category) {
      whereConditions.push(`d.groupName = :category`);
      replacements.category = category;
    }
    
    if (departmentId) {
      whereConditions.push(`a.departmentid = :departmentId`);
      replacements.departmentId = departmentId;
    }
    
    if (status && status !== 'All') {
      whereConditions.push(`a.status = :status`);
      replacements.status = status;
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ');
    }
    
    query += ` ORDER BY a.date, a.indentNo, c.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error in /purchase-indent-report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/purchase-indent-report/export/csv', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchIndentNo, category, status, departmentId } = req.query;
    
    let query = `
      SELECT 
        a.indentno AS 'Indent No', 
        a.date AS 'Date', 
        b.name AS 'Department', 
        d.groupName AS 'Category', 
        e.itemDescription AS 'Item Description', 
        c.indentQty AS 'Indent Qty',
        c.uom AS 'UOM',
        c.dueDate AS 'Due Date',
        c.remarks AS 'Remarks'
      FROM purchaseindents a 
      JOIN departments b ON a.departmentid = b.id 
      JOIN purchaseindentdetails c ON a.id = c.purchaseIndentId 
      JOIN maincategories d ON c.mainCategoryId = d.id 
      JOIN items e ON c.itemId = e.id 
    `;
    
    const whereConditions = [];
    const replacements = {};
    
    if (fromDate) {
      whereConditions.push(`a.date >= :fromDate`);
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      whereConditions.push(`a.date <= :toDate`);
      replacements.toDate = toDate;
    }
    
    if (searchTerm) {
      whereConditions.push(`e.itemDescription LIKE :searchTerm`);
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (searchIndentNo) {
      whereConditions.push(`a.indentno LIKE :searchIndentNo`);
      replacements.searchIndentNo = `%${searchIndentNo}%`;
    }
    
    if (category) {
      whereConditions.push(`d.groupName = :category`);
      replacements.category = category;
    }
    
    if (departmentId) {
      whereConditions.push(`a.departmentid = :departmentId`);
      replacements.departmentId = departmentId;
    }
    
    if (status && status !== 'All') {
      whereConditions.push(`a.status = :status`);
      replacements.status = status;
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ` + whereConditions.join(' AND ');
    }
    
    query += ` ORDER BY a.date, a.indentNo, c.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    const headers = ['Indent No', 'Date', 'Department', 'Category', 'Item Description', 'Indent Qty', 'UOM', 'Due Date', 'Remarks'];
    const csvRows = [headers.join(',')];
    
    const formatDateToDDMMYYYY = (dateValue) => {
      if (!dateValue) return '';
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      } catch (e) {
        return '';
      }
    };
    
    for (const row of results) {
      const formattedDate = formatDateToDDMMYYYY(row['Date']);
      const formattedDueDate = formatDateToDDMMYYYY(row['Due Date']);
      
      const values = [
        `"${(row['Indent No'] || '').toString().replace(/"/g, '""')}"`,
        `"${formattedDate}"`,
        `"${(row['Department'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Category'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Item Description'] || '').toString().replace(/"/g, '""')}"`,
        row['Indent Qty'] || 0,
        `"${(row['UOM'] || '').toString().replace(/"/g, '""')}"`,
        `"${formattedDueDate}"`,
        `"${(row['Remarks'] || '').toString().replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_indent_report.csv');
    res.setHeader('Cache-Control', 'no-cache');
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PURCHASE ORDER REPORT ====================
router.get('/purchase-order-report', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchPONo, supplier } = req.query;
    
    let query = `
      SELECT 
        po.poNo AS ponumber,
        po.date AS podate,
        po.supplierName AS supplier,
        po.deliveryDate AS deliverydate,
        po.poType AS potype,
        pod.indentNo,
        pod.itemName,
        pod.uom,
        pod.poQty,
        pod.poAmount AS poamt,
        pod.poRate AS porate,
        pod.discPrice,
        pod.totGst,
        pod.totalAmount
      FROM purchaseorders po 
      LEFT JOIN purchaseorderdetails pod ON po.id = pod.purchaseOrderId 
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND po.date >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND po.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchPONo) {
      query += ` AND po.poNo LIKE :searchPONo`;
      replacements.searchPONo = `%${searchPONo}%`;
    }
    
    if (searchTerm) {
      query += ` AND (pod.itemName LIKE :searchTerm OR pod.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND po.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    query += ` ORDER BY po.date DESC, po.poNo, pod.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/purchase-order-report/export/csv', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchPONo, supplier } = req.query;
    
    let query = `
      SELECT 
        po.poNo AS 'PO Number',
        po.date AS 'PO Date',
        po.supplierName AS 'Supplier',
        po.deliveryDate AS 'Delivery Date',
        po.poType AS 'PO Type',
        pod.indentNo AS 'Indent No',
        pod.itemName AS 'Item Name',
        pod.uom AS 'UOM',
        pod.poQty AS 'PO Qty',
        pod.poRate AS 'Rate',
        pod.discPrice AS 'Discount',
        pod.totGst AS 'GST',
        pod.totalAmount AS 'Total Amount'
      FROM purchaseorders po 
      LEFT JOIN purchaseorderdetails pod ON po.id = pod.purchaseOrderId 
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND po.date >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND po.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchPONo) {
      query += ` AND po.poNo LIKE :searchPONo`;
      replacements.searchPONo = `%${searchPONo}%`;
    }
    
    if (searchTerm) {
      query += ` AND (pod.itemName LIKE :searchTerm OR pod.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND po.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    query += ` ORDER BY po.date DESC, po.poNo, pod.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    const headers = ['PO Number', 'PO Date', 'Supplier', 'Delivery Date', 'PO Type', 'Indent No', 'Item Name', 'UOM', 'PO Qty', 'Rate', 'Discount', 'GST', 'Total Amount'];
    const csvRows = [headers.join(',')];
    
    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
      } catch (e) {
        return '';
      }
    };
    
    for (const row of results) {
      const values = [
        `"${(row['PO Number'] || '').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['PO Date'])}"`,
        `"${(row['Supplier'] || '').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['Delivery Date'])}"`,
        `"${(row['PO Type'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Indent No'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Item Name'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['UOM'] || '').toString().replace(/"/g, '""')}"`,
        row['PO Qty'] || 0,
        row['Rate'] || 0,
        row['Discount'] || 0,
        row['GST'] || 0,
        row['Total Amount'] || 0
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_order_report.csv');
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PURCHASE GRN REPORT ====================
router.get('/purchase-grn-report', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchGRNNo, supplier, poNo } = req.query;
    
    let query = `
      SELECT 
        pg.grnNo,
        pg.date AS grnDate,
        pg.supplierName,
        pg.invoiceNo,
        pgd.poNo,
        pgd.indentNo,
        pgd.itemName,
        pgd.uom,
        pgd.grnQty,
        pgd.phyQty,
        pgd.grnRate,
        pgd.discPct,
        pgd.totGst,
        pgd.totalAmount AS detailTotalAmount
      FROM purchasegrns pg 
      LEFT JOIN purchasegrndetails pgd ON pg.id = pgd.purchaseGRNId 
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND pg.date >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND pg.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchGRNNo) {
      query += ` AND pg.grnNo LIKE :searchGRNNo`;
      replacements.searchGRNNo = `%${searchGRNNo}%`;
    }
    
    if (searchTerm) {
      query += ` AND (pgd.itemName LIKE :searchTerm OR pgd.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND pg.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    if (poNo) {
      query += ` AND pgd.poNo LIKE :poNo`;
      replacements.poNo = `%${poNo}%`;
    }
    
    query += ` ORDER BY pg.date DESC, pg.grnNo, pgd.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error in /purchase-grn-report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/purchase-grn-report/export/csv', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchGRNNo, supplier, poNo } = req.query;
    
    let query = `
      SELECT 
        pg.grnNo AS 'GRN No',
        pg.date AS 'GRN Date',
        pg.supplierName AS 'Supplier',
        pg.invoiceNo AS 'Invoice No',
        pgd.poNo AS 'PO No',
        pgd.indentNo AS 'Indent No',
        pgd.itemName AS 'Item Name',
        pgd.uom AS 'UOM',
        pgd.grnQty AS 'GRN Qty',
        pgd.phyQty AS 'Physical Qty',
        pgd.grnRate AS 'Rate',
        pgd.discPct AS 'Discount %',
        pgd.totGst AS 'Total GST',
        pgd.totalAmount AS 'Total Amount'
      FROM purchasegrns pg 
      LEFT JOIN purchasegrndetails pgd ON pg.id = pgd.purchaseGRNId 
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND pg.date >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND pg.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchGRNNo) {
      query += ` AND pg.grnNo LIKE :searchGRNNo`;
      replacements.searchGRNNo = `%${searchGRNNo}%`;
    }
    
    if (searchTerm) {
      query += ` AND (pgd.itemName LIKE :searchTerm OR pgd.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND pg.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    if (poNo) {
      query += ` AND pgd.poNo LIKE :poNo`;
      replacements.poNo = `%${poNo}%`;
    }
    
    query += ` ORDER BY pg.date DESC, pg.grnNo, pgd.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    const headers = ['GRN No', 'GRN Date', 'Supplier', 'Invoice No', 'PO No', 'Indent No', 'Item Name', 'UOM', 'GRN Qty', 'Physical Qty', 'Rate', 'Discount %', 'Total GST', 'Total Amount'];
    const csvRows = [headers.join(',')];
    
    const formatDate = (dateValue) => {
      if (!dateValue) return '';
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
      } catch (e) {
        return '';
      }
    };
    
    for (const row of results) {
      const values = [
        `"${(row['GRN No'] || '').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['GRN Date'])}"`,
        `"${(row['Supplier'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Invoice No'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['PO No'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Indent No'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Item Name'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['UOM'] || '').toString().replace(/"/g, '""')}"`,
        row['GRN Qty'] || 0,
        row['Physical Qty'] || 0,
        row['Rate'] || 0,
        row['Discount %'] || 0,
        row['Total GST'] || 0,
        row['Total Amount'] || 0
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_grn_report.csv');
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;