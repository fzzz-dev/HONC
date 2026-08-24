const express = require('express');
const router = express.Router();
const sequelize = require('../config/database');

router.get('/test', (req, res) => {
  res.json({ message: 'Reports API is working!' });
});

// ==================== PURCHASE INDENT REPORT ====================
router.get('/purchase-indent-report', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchIndentNo, category, status, departmentName } = req.query;
    
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
      FROM PurchaseIndents a 
      JOIN Departments b ON a.departmentid = b.id 
      JOIN PurchaseIndentDetails c ON a.id = c.purchaseIndentId 
      JOIN MainCategories d ON c.mainCategoryId = d.id 
      JOIN Items e ON c.itemId = e.id 
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
    
    // FIXED: departmentId contains the department name
    if (departmentName) {
      whereConditions.push(`b.name = :departmentName`);
      replacements.departmentName = departmentName;  
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

    res.status(500).json({ success: false, message: error.message });
  }
  


});
// Add these after your existing routes in reports.js

router.get('/purchase-indent-report/all-categories', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT d.groupName 
      FROM PurchaseIndentDetails c 
      JOIN MainCategories d ON c.mainCategoryId = d.id 
      WHERE d.groupName IS NOT NULL AND d.groupName != ''
      ORDER BY d.groupName ASC
    `);
    
    const categories = results.map(row => row.groupName);
    res.json({ success: true, data: categories });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all distinct departments (always returns all departments, not filtered by results)
router.get('/purchase-indent-report/all-departments', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT b.name 
      FROM PurchaseIndents a 
      JOIN Departments b ON a.departmentid = b.id 
      WHERE b.name IS NOT NULL AND b.name != ''
      ORDER BY b.name ASC
    `);
    
    const departments = results.map(row => row.name);
    res.json({ success: true, data: departments });
  } catch (error) {

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
      FROM PurchaseIndents a 
      JOIN Departments b ON a.departmentid = b.id 
      JOIN PurchaseIndentDetails c ON a.id = c.purchaseIndentId 
      JOIN MainCategories d ON c.mainCategoryId = d.id 
      JOIN Items e ON c.itemId = e.id 
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
        po.status AS status,  -- 🔥 ADDED
        po.transportCharges AS transportCharges,
        po.totalAmount AS totalAmount,
        pod.indentNo,
        pod.itemName,
        pod.uom,
        pod.poQty,
        pod.poAmount AS poamt,
        pod.poRate AS porate,
        pod.discPrice,
        pod.totGst,
        pod.totalAmount AS itemTotalAmount
      FROM PurchaseOrders po 
      LEFT JOIN PurchaseOrderDetails pod ON po.id = pod.purchaseOrderId 
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
    console.error('Error in purchase-order-report:', error);
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
        po.status AS 'Status',  -- 🔥 ADDED
        po.transportCharges AS 'Transport Charges',
        po.totalAmount AS 'PO Total Amount',
        pod.indentNo AS 'Indent No',
        pod.itemName AS 'Item Name',
        pod.uom AS 'UOM',
        pod.poQty AS 'PO Qty',
        pod.poRate AS 'Rate',
        pod.discPrice AS 'Discount',
        pod.totGst AS 'GST',
        pod.totalAmount AS 'Item Total Amount'
      FROM PurchaseOrders po 
      LEFT JOIN PurchaseOrderDetails pod ON po.id = pod.purchaseOrderId 
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
    
    const headers = ['PO Number', 'PO Date', 'Supplier', 'Delivery Date', 'PO Type', 'Status', 'Transport Charges', 'PO Total Amount', 'Indent No', 'Item Name', 'UOM', 'PO Qty', 'Rate', 'Discount', 'GST', 'Item Total Amount'];
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
        `"${(row['Status'] || '').toString().replace(/"/g, '""')}"`,  // 🔥 ADDED
        row['Transport Charges'] || 0,
        row['PO Total Amount'] || 0,
        `"${(row['Indent No'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Item Name'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['UOM'] || '').toString().replace(/"/g, '""')}"`,
        row['PO Qty'] || 0,
        row['Rate'] || 0,
        row['Discount'] || 0,
        row['GST'] || 0,
        row['Item Total Amount'] || 0
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_order_report.csv');
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
    
  } catch (error) {
    console.error('Error in purchase-order-report/export/csv:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



// Get all distinct suppliers for dropdown
router.get('/purchase-order-report/suppliers', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT supplierName 
      FROM PurchaseOrders 
      WHERE supplierName IS NOT NULL AND supplierName != ''
      ORDER BY supplierName
    `);
    
    const suppliers = results.map(row => row.supplierName);
    res.json({ success: true, data: suppliers });
  } catch (error) {

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
      FROM PurchaseGRNs pg 
      LEFT JOIN PurchaseGRNDetails pgd ON pg.id = pgd.purchaseGRNId 
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
      FROM PurchaseGRNs pg 
      LEFT JOIN PurchaseGRNDetails pgd ON pg.id = pgd.purchaseGRNId 
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

    res.status(500).json({ success: false, message: error.message });
  }
});

// Add this to your backend reports.js

router.get('/purchase-grn-report/suppliers', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT DISTINCT supplierName 
      FROM PurchaseGRNs 
      WHERE supplierName IS NOT NULL AND supplierName != ''
      ORDER BY supplierName ASC
    `);
    
    const suppliers = results.map(row => row.supplierName);
    res.json({ success: true, data: suppliers });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});


// ==================== INVENTORY STOCK FLOW REPORT ====================

// Get Inventory Stock Flow Report
router.get('/inventory/stock-flow', async (req, res) => {
  const { fromDate, toDate } = req.query;
  
  try {
    let query = `
      SELECT 
        a.storename, 
        a.maincat, 
        a.itemdescription, 
        SUM(a.opstk) AS opstk, 
        SUM(a.recqty) AS recqty, 
        SUM(a.issqty) AS isstqy,  
        SUM(a.opstk) + SUM(a.recqty) - SUM(a.issqty) AS clsstk 
      FROM (
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          SUM(a.recqty) - SUM(a.issqty) AS opstk, 
          0 AS recqty, 
          0 AS issqty  
        FROM v_item_stock_new a 
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` WHERE a.date < :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    query += `
        GROUP BY a.storename, a.maincat, a.itemdescription 
        
        UNION ALL
        
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          0 AS opty, 
          SUM(a.recqty) AS recqty, 
          SUM(a.issqty) AS issqty   
        FROM v_item_stock_new a 
    `;
    
    if (fromDate && toDate) {
      query += ` WHERE a.date BETWEEN :fromDate AND :toDate`;
      replacements.toDate = toDate;
    } else if (fromDate) {
      query += ` WHERE a.date >= :fromDate`;
    } else if (toDate) {
      query += ` WHERE a.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    query += `
        GROUP BY a.storename, a.maincat, a.itemdescription
      ) a 
      GROUP BY a.storename, a.maincat, a.itemdescription 
      ORDER BY a.storename, a.maincat, a.itemdescription
    `;
    
    const results = await sequelize.query(query, { replacements });
    const dataArray = results[0] || [];
    
    res.json({
      success: true,
      data: dataArray,
      count: dataArray.length
    });
    
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Report Summary
router.get('/inventory/stock-flow/summary', async (req, res) => {
  const { fromDate, toDate } = req.query;
  
  try {
    let query = `
      SELECT 
        COUNT(DISTINCT CONCAT(a.storename, a.maincat, a.itemdescription)) AS totalItems,
        SUM(a.opstk) AS totalOpeningStock,
        SUM(a.recqty) AS totalReceived,
        SUM(a.issqty) AS totalIssued,
        SUM(a.opstk) + SUM(a.recqty) - SUM(a.issqty) AS totalClosingStock
      FROM (
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          SUM(a.recqty) - SUM(a.issqty) AS opstk, 
          0 AS recqty, 
          0 AS issqty  
        FROM v_item_stock_new a 
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` WHERE a.date < :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    query += `
        GROUP BY a.storename, a.maincat, a.itemdescription 
        
        UNION ALL
        
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          0 AS opty, 
          SUM(a.recqty) AS recqty, 
          SUM(a.issqty) AS issqty   
        FROM v_item_stock_new a 
    `;
    
    if (fromDate && toDate) {
      query += ` WHERE a.date BETWEEN :fromDate AND :toDate`;
      replacements.toDate = toDate;
    } else if (fromDate) {
      query += ` WHERE a.date >= :fromDate`;
    } else if (toDate) {
      query += ` WHERE a.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    query += `
        GROUP BY a.storename, a.maincat, a.itemdescription
      ) a 
    `;
    
    const results = await sequelize.query(query, { replacements });
    const summaryData = results[0] || [{}];
    
    res.json({
      success: true,
      data: {
        totalItems: Number(summaryData[0]?.totalItems) || 0,
        totalOpeningStock: Number(summaryData[0]?.totalOpeningStock) || 0,
        totalReceived: Number(summaryData[0]?.totalReceived) || 0,
        totalIssued: Number(summaryData[0]?.totalIssued) || 0,
        totalClosingStock: Number(summaryData[0]?.totalClosingStock) || 0
      }
    });
    
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Date Range (min and max dates from data)
router.get('/inventory/stock-flow/date-range', async (req, res) => {
  try {
    const query = `
      SELECT 
        MIN(date) AS minDate,
        MAX(date) AS maxDate
      FROM v_item_stock_new
    `;
    
    const results = await sequelize.query(query);
    const dateRange = results[0] || [{}];
    
    res.json({
      success: true,
      data: {
        minDate: dateRange[0]?.minDate || null,
        maxDate: dateRange[0]?.maxDate || null
      }
    });
    
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});


// Export CSV for Stock Flow Report
router.get('/inventory/stock-flow/export/csv', async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    let query = `
      SELECT 
        a.storename, 
        a.maincat, 
        a.itemdescription, 
        SUM(a.opstk) AS opstk, 
        SUM(a.recqty) AS recqty, 
        SUM(a.issqty) AS isstqy,  
        SUM(a.opstk) + SUM(a.recqty) - SUM(a.issqty) AS clsstk 
      FROM (
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          SUM(a.recqty) - SUM(a.issqty) AS opstk, 
          0 AS recqty, 
          0 AS issqty  
        FROM v_item_stock_new a 
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` WHERE a.date < :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    query += `
        GROUP BY a.storename, a.maincat, a.itemdescription 
        
        UNION ALL
        
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          0 AS opty, 
          SUM(a.recqty) AS recqty, 
          SUM(a.issqty) AS issqty   
        FROM v_item_stock_new a 
    `;
    
    if (fromDate && toDate) {
      query += ` WHERE a.date BETWEEN :fromDate AND :toDate`;
      replacements.toDate = toDate;
    } else if (fromDate) {
      query += ` WHERE a.date >= :fromDate`;
    } else if (toDate) {
      query += ` WHERE a.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    query += `
        GROUP BY a.storename, a.maincat, a.itemdescription
      ) a 
      GROUP BY a.storename, a.maincat, a.itemdescription 
      ORDER BY a.storename, a.maincat, a.itemdescription
    `;
    
    // FIX: Remove the array destructuring and type
    const results = await sequelize.query(query, { replacements });
    const dataArray = results[0] || [];
    
    if (dataArray.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
    const headers = ['Store Name', 'Main Category', 'Item Description', 'Opening Stock', 'Received Qty', 'Issued Qty', 'Closing Stock'];
    const csvRows = [headers.join(',')];
    
    for (const row of dataArray) {
      const values = [
        `"${(row.storename || '').toString().replace(/"/g, '""')}"`,
        `"${(row.maincat || '').toString().replace(/"/g, '""')}"`,
        `"${(row.itemdescription || '').toString().replace(/"/g, '""')}"`,
        row.opstk || 0,
        row.recqty || 0,
        row.isstqy || 0,
        row.clsstk || 0
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=inventory_stock_flow_${fromDate || 'all'}_to_${toDate || 'all'}.csv`);
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
    
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});




//level 2 pending approval
router.get('/po-level2-pending', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        po.id,
        po.poNo AS ponumber,
        po.date AS podate,
        po.supplierName AS supplier,
        po.supplierId,
        po.deliveryDate AS deliverydate,
        po.poType AS potype,
        po.transportCharges AS transportCharges,
        po.totalAmount AS totalAmount,
        po.level1Approved,
        po.level2Approved,
        po.level1ApprovedBy,
        po.level1ApprovedDate,
        po.level2ApprovedBy,
        po.level2ApprovedDate,
        po.status,
        po.createdBy,
        po.createdOn,
        pod.indentNo,
        pod.itemName,
        pod.itemId,
        pod.uom,
        pod.poQty,
        pod.poAmount AS poamt,
        pod.poRate AS porate,
        pod.discPrice,
        pod.totGst,
        pod.gstPct,
        pod.sgst,
        pod.cgst,
        pod.igst,
        pod.totalAmount AS itemTotalAmount
      FROM PurchaseOrders po 
      LEFT JOIN PurchaseOrderDetails pod ON po.id = pod.purchaseOrderId 
      WHERE po.level2Approved = 'No' 
      AND po.status != 'Closed'
      ORDER BY po.date DESC, po.poNo, pod.id
    `);
    
    const poSummary = {};
    results.forEach(row => {
      if (!poSummary[row.id]) {
        poSummary[row.id] = {
          id: row.id,
          ponumber: row.ponumber,
          podate: row.podate,
          supplier: row.supplier,
          supplierId: row.supplierId,
          deliverydate: row.deliverydate,
          potype: row.potype,
          transportCharges: Number(row.transportCharges) || 0,
          totalAmount: Number(row.totalAmount) || 0,
          level1Approved: row.level1Approved,
          level2Approved: row.level2Approved,
          level1ApprovedBy: row.level1ApprovedBy,
          level1ApprovedDate: row.level1ApprovedDate,
          level2ApprovedBy: row.level2ApprovedBy,
          level2ApprovedDate: row.level2ApprovedDate,
          status: row.status,
          createdBy: row.createdBy,
          createdOn: row.createdOn,
          items: []
        };
      }
      if (row.itemName) {
        poSummary[row.id].items.push({
          indentNo: row.indentNo,
          itemId: row.itemId,
          itemName: row.itemName,
          uom: row.uom,
          poQty: row.poQty,
          poRate: row.porate,
          poAmount: row.poamt,
          discPrice: row.discPrice,
          totGst: row.totGst,
          gstPct: row.gstPct,
          sgst: row.sgst,
          cgst: row.cgst,
          igst: row.igst,
          totalAmount: Number(row.itemTotalAmount) || 0
        });
      }
    });
    
    res.json({
      success: true,
      data: Object.values(poSummary),
      count: Object.keys(poSummary).length,
      type: 'level2-pending'
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// ============= LEVEL 1 PENDING APPROVAL =============
router.get('/po-level1-pending', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        po.id,
        po.poNo AS ponumber,
        po.date AS podate,
        po.supplierName AS supplier,
        po.supplierId,
        po.deliveryDate AS deliverydate,
        po.poType AS potype,
        po.transportCharges AS transportCharges,
        po.totalAmount AS totalAmount,
        po.level1Approved,
        po.level2Approved,
        po.level1ApprovedBy,
        po.level1ApprovedDate,
        po.level2ApprovedBy,
        po.level2ApprovedDate,
        po.status,
        po.createdBy,
        po.createdOn,
        pod.indentNo,
        pod.itemName,
        pod.itemId,
        pod.uom,
        pod.poQty,
        pod.poAmount AS poamt,
        pod.poRate AS porate,
        pod.discPrice,
        pod.totGst,
        pod.gstPct,
        pod.sgst,
        pod.cgst,
        pod.igst,
        pod.totalAmount AS itemTotalAmount
      FROM PurchaseOrders po 
      LEFT JOIN PurchaseOrderDetails pod ON po.id = pod.purchaseOrderId 
      WHERE po.level2Approved = 'Yes' 
      AND po.level1Approved = 'No'
      AND po.status != 'Closed'
      ORDER BY po.date DESC, po.poNo, pod.id
    `);
    
    const poSummary = {};
    results.forEach(row => {
      if (!poSummary[row.id]) {
        poSummary[row.id] = {
          id: row.id,
          ponumber: row.ponumber,
          podate: row.podate,
          supplier: row.supplier,
          supplierId: row.supplierId,
          deliverydate: row.deliverydate,
          potype: row.potype,
          transportCharges: Number(row.transportCharges) || 0,
          totalAmount: Number(row.totalAmount) || 0,
          level1Approved: row.level1Approved,
          level2Approved: row.level2Approved,
          level1ApprovedBy: row.level1ApprovedBy,
          level1ApprovedDate: row.level1ApprovedDate,
          level2ApprovedBy: row.level2ApprovedBy,
          level2ApprovedDate: row.level2ApprovedDate,
          status: row.status,
          createdBy: row.createdBy,
          createdOn: row.createdOn,
          items: []
        };
      }
      if (row.itemName) {
        poSummary[row.id].items.push({
          indentNo: row.indentNo,
          itemId: row.itemId,
          itemName: row.itemName,
          uom: row.uom,
          poQty: row.poQty,
          poRate: row.porate,
          poAmount: row.poamt,
          discPrice: row.discPrice,
          totGst: row.totGst,
          gstPct: row.gstPct,
          sgst: row.sgst,
          cgst: row.cgst,
          igst: row.igst,
          totalAmount: Number(row.itemTotalAmount) || 0
        });
      }
    });
    
    res.json({
      success: true,
      data: Object.values(poSummary),
      count: Object.keys(poSummary).length,
      type: 'level1-pending'
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
});

// ============= BULK APPROVE LEVEL 2 =============
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

// ============= BULK APPROVE LEVEL 1 =============
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
       WHERE id IN (${placeholders}) 
       AND level2Approved = 'Yes' 
       AND level1Approved = 'No'`,
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

// ============= APPROVE LEVEL 2 =============
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

// ============= APPROVE LEVEL 1 =============
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

// ==================== EMPLOYEE REPORT ====================

// ─── GET /api/reports/employee-report ──────────────────────────────────────
router.get('/employee-report', async (req, res) => {
  try {
    const { searchTerm, departmentId, designationId, status } = req.query;
    
    let query = `
      SELECT 
        e.id,
        e.employee_code,
        e.first_name,
        e.last_name,
        CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS full_name,
        e.father_name,
        e.date_of_birth,
        e.gender,
        e.blood_group,
        e.contact_phone,
        e.contact_email,
        e.date_of_joining,
        e.department_id,
        d.name AS department_name,
        e.designation_id,
        des.name AS designation_name,
        e.employment_type,
        e.basic_salary,
        e.hra,
        e.allowances,
        e.total_salary,
        e.pan_number,
        e.aadhar_number,
        e.pf_number,
        e.bank_name,
        e.bank_account_no,
        e.ifsc_code,
        e.account_holder_name,
        e.bank_branch,
        e.present_address,
        e.permanent_address,
        e.remarks,
        e.is_active,
        e.management_staff,
        e.visitors_allowed,
        e.guest,
        e.created_at,
        e.updated_at,
        e.photo_url
      FROM hr_employee_master e
      LEFT JOIN hr_department d ON e.department_id = d.id AND d.is_active = 1
      LEFT JOIN hr_designation des ON e.designation_id = des.id AND des.is_active = 1
      WHERE 1=1
    `;
    
    const replacements = {};
    
    // Search term - search in employee_code, first_name, last_name, contact_phone
    if (searchTerm) {
      query += ` AND (
        e.employee_code LIKE :searchTerm OR 
        e.first_name LIKE :searchTerm OR 
        e.last_name LIKE :searchTerm OR 
        e.contact_phone LIKE :searchTerm
      )`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    // Department filter
    if (departmentId) {
      query += ` AND e.department_id = :departmentId`;
      replacements.departmentId = parseInt(departmentId);
    }
    
    // Designation filter
    if (designationId) {
      query += ` AND e.designation_id = :designationId`;
      replacements.designationId = parseInt(designationId);
    }
    
    // Status filter (default to show all, but can filter)
    if (status !== undefined && status !== '') {
      query += ` AND e.is_active = :status`;
      replacements.status = parseInt(status);
    }
    
    query += ` ORDER BY e.employee_code ASC`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error in employee-report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/reports/employee-report/departments ──────────────────────────
router.get('/employee-report/departments', async (req, res) => {
  try {
    const [results] = await sequelize.query(`
      SELECT 
        id, 
        name, 
        code 
      FROM hr_department 
      WHERE is_active = 1 
      ORDER BY name ASC
    `);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching departments for employee report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/reports/employee-report/designations ─────────────────────────
router.get('/employee-report/designations', async (req, res) => {
  try {
    const { departmentId } = req.query;
    
    let query = `
      SELECT 
        id, 
        name, 
        level 
      FROM hr_designation 
      WHERE is_active = 1
    `;
    
    const replacements = {};
    
    if (departmentId) {
      query += ` AND department_id = :departmentId`;
      replacements.departmentId = parseInt(departmentId);
    }
    
    query += ` ORDER BY name ASC`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error fetching designations for employee report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/reports/employee-report/export/csv ────────────────────────────
router.get('/employee-report/export/csv', async (req, res) => {
  try {
    const { searchTerm, departmentId, designationId, status } = req.query;
    
    let query = `
      SELECT 
        e.employee_code AS 'Employee Code',
        e.first_name AS 'First Name',
        e.last_name AS 'Last Name',
        CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS 'Full Name',
        e.date_of_birth AS 'Date of Birth',
        e.gender AS 'Gender',
        e.contact_phone AS 'Contact Phone',
        e.contact_email AS 'Contact Email',
        d.name AS 'Department',
        des.name AS 'Designation',
        e.employment_type AS 'Employment Type',
        e.total_salary AS 'Total Salary',
        e.management_staff AS 'Management Staff',
        CASE WHEN e.is_active = 1 THEN 'Active' ELSE 'Inactive' END AS 'Status',
        e.date_of_joining AS 'Date of Joining',
        e.pan_number AS 'PAN Number',
        e.aadhar_number AS 'Aadhar Number',
        e.bank_name AS 'Bank Name',
        e.bank_account_no AS 'Account Number',
        e.ifsc_code AS 'IFSC Code'
      FROM hr_employee_master e
      LEFT JOIN hr_department d ON e.department_id = d.id AND d.is_active = 1
      LEFT JOIN hr_designation des ON e.designation_id = des.id AND des.is_active = 1
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (searchTerm) {
      query += ` AND (
        e.employee_code LIKE :searchTerm OR 
        e.first_name LIKE :searchTerm OR 
        e.last_name LIKE :searchTerm OR 
        e.contact_phone LIKE :searchTerm
      )`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (departmentId) {
      query += ` AND e.department_id = :departmentId`;
      replacements.departmentId = parseInt(departmentId);
    }
    
    if (designationId) {
      query += ` AND e.designation_id = :designationId`;
      replacements.designationId = parseInt(designationId);
    }
    
    if (status !== undefined && status !== '') {
      query += ` AND e.is_active = :status`;
      replacements.status = parseInt(status);
    }
    
    query += ` ORDER BY e.employee_code ASC`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
    const headers = [
      'Employee Code', 'First Name', 'Last Name', 'Full Name', 
      'Date of Birth', 'Gender', 'Contact Phone', 'Contact Email',
      'Department', 'Designation', 'Employment Type', 'Total Salary',
      'Management Staff', 'Status', 'Date of Joining',
      'PAN Number', 'Aadhar Number', 'Bank Name', 'Account Number', 'IFSC Code'
    ];
    
    const csvRows = [headers.join(',')];
    
    const formatDate = (dateValue) => {
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
      const values = [
        `"${(row['Employee Code'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['First Name'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Last Name'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Full Name'] || '').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['Date of Birth'])}"`,
        `"${(row['Gender'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Contact Phone'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Contact Email'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Department'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Designation'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Employment Type'] || '').toString().replace(/"/g, '""')}"`,
        row['Total Salary'] || 0,
        `"${(row['Management Staff'] || 'No').toString().replace(/"/g, '""')}"`,
        `"${(row['Status'] || 'Active').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['Date of Joining'])}"`,
        `"${(row['PAN Number'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Aadhar Number'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Bank Name'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Account Number'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['IFSC Code'] || '').toString().replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=employee_report_${new Date().toISOString().split('T')[0]}.csv`);
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
    
  } catch (error) {
    console.error('Error in employee-report/export/csv:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;