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
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== INVENTORY STOCK FLOW REPORT ====================
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
    
    // FIX: Remove the array destructuring and type
    const results = await sequelize.query(query, { replacements });
    
    // The results[0] contains the actual data array
    const dataArray = results[0] || [];

    
    res.json({
      success: true,
      data: dataArray,
      count: dataArray.length
    });
    
  } catch (error) {
    console.error('Error fetching stock flow report:', error);
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
    console.error('Error exporting stock flow report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ============= LEVEL 2 FIRST APPROVAL =============

// GET - Level 2 pending (shows POs waiting for Level 2 approval)
router.get('/po-level2-pending', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchPONo, supplier } = req.query;
    
    let query = `
      SELECT 
        po.id,
        po.poNo AS ponumber,
        po.date AS podate,
        po.supplierName AS supplier,
        po.deliveryDate AS deliverydate,
        po.poType AS potype,
        po.level1Approved,
        po.level2Approved,
        po.status,
        po.createdBy,
        po.createdOn,
        pod.indentNo,
        pod.itemName,
        pod.uom,
        pod.poQty,
        pod.poAmount AS poamt,
        pod.poRate AS porate,
        pod.discPrice,
        pod.totGst,
        pod.totalAmount
      FROM PurchaseOrders po 
      LEFT JOIN PurchaseOrderDetails pod ON po.id = pod.purchaseOrderId 
      WHERE po.level2Approved = 'No' 
      AND po.status != 'Closed'
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
      query += ` AND po.supplierName LIKE :supplier`;
      replacements.supplier = `%${supplier}%`;
    }
    
    query += ` ORDER BY po.date DESC, po.poNo, pod.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    const poSummary = {};
    results.forEach(row => {
      if (!poSummary[row.id]) {
        poSummary[row.id] = {
          id: row.id,
          ponumber: row.ponumber,
          podate: row.podate,
          supplier: row.supplier,
          deliverydate: row.deliverydate,
          potype: row.potype,
          level1Approved: row.level1Approved,
          level2Approved: row.level2Approved,
          status: row.status,
          createdBy: row.createdBy,
          createdOn: row.createdOn,
          totalAmount: 0,
          items: []
        };
      }
      if (row.itemName) {
        poSummary[row.id].items.push({
          indentNo: row.indentNo,
          itemName: row.itemName,
          uom: row.uom,
          poQty: row.poQty,
          poRate: row.porate,
          poAmount: row.poamt,
          discPrice: row.discPrice,
          totGst: row.totGst,
          totalAmount: row.totalAmount
        });
        poSummary[row.id].totalAmount += (row.totalAmount || 0);
      }
    });
    
    res.json({
      success: true,
      data: Object.values(poSummary),
      count: Object.keys(poSummary).length,
      type: 'level2-pending'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Approve Level 2 (First Approval)
router.put('/approve-level2/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    const [updated] = await sequelize.query(
      `UPDATE PurchaseOrders 
       SET level2Approved = 'Yes', 
           level2ApprovedBy = :approvedBy, 
           level2ApprovedDate = NOW()
       WHERE id = :id AND level2Approved = 'No'`,
      {
        replacements: { id, approvedBy: approvedBy || 'System' },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    if (updated === 0) {
      return res.status(404).json({ success: false, message: 'PO not found or already approved' });
    }
    
    res.json({ success: true, message: 'Level 2 approved successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Bulk Approve Level 2
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
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============= LEVEL 1 FINAL APPROVAL =============

// GET - Level 1 pending (shows POs with Level 2 approved, waiting for Level 1)
router.get('/po-level1-pending', async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchPONo, supplier } = req.query;
    
    let query = `
      SELECT 
        po.id,
        po.poNo AS ponumber,
        po.date AS podate,
        po.supplierName AS supplier,
        po.deliveryDate AS deliverydate,
        po.poType AS potype,
        po.level1Approved,
        po.level2Approved,
        po.status,
        po.createdBy,
        po.createdOn,
        pod.indentNo,
        pod.itemName,
        pod.uom,
        pod.poQty,
        pod.poAmount AS poamt,
        pod.poRate AS porate,
        pod.discPrice,
        pod.totGst,
        pod.totalAmount
      FROM PurchaseOrders po 
      LEFT JOIN PurchaseOrderDetails pod ON po.id = pod.purchaseOrderId 
      WHERE po.level2Approved = 'Yes' 
      AND po.level1Approved = 'No'
      AND po.status != 'Closed'
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
      query += ` AND po.supplierName LIKE :supplier`;
      replacements.supplier = `%${supplier}%`;
    }
    
    query += ` ORDER BY po.date DESC, po.poNo, pod.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    const poSummary = {};
    results.forEach(row => {
      if (!poSummary[row.id]) {
        poSummary[row.id] = {
          id: row.id,
          ponumber: row.ponumber,
          podate: row.podate,
          supplier: row.supplier,
          deliverydate: row.deliverydate,
          potype: row.potype,
          level1Approved: row.level1Approved,
          level2Approved: row.level2Approved,
          status: row.status,
          createdBy: row.createdBy,
          createdOn: row.createdOn,
          totalAmount: 0,
          items: []
        };
      }
      if (row.itemName) {
        poSummary[row.id].items.push({
          indentNo: row.indentNo,
          itemName: row.itemName,
          uom: row.uom,
          poQty: row.poQty,
          poRate: row.porate,
          poAmount: row.poamt,
          discPrice: row.discPrice,
          totGst: row.totGst,
          totalAmount: row.totalAmount
        });
        poSummary[row.id].totalAmount += (row.totalAmount || 0);
      }
    });
    
    res.json({
      success: true,
      data: Object.values(poSummary),
      count: Object.keys(poSummary).length,
      type: 'level1-pending'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Approve Level 1 (Final Approval)
router.put('/approve-level1/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;
    
    const [updated] = await sequelize.query(
      `UPDATE PurchaseOrders 
       SET level1Approved = 'Yes', 
           level1ApprovedBy = :approvedBy, 
           level1ApprovedDate = NOW(),
           status = 'Approved'
       WHERE id = :id 
       AND level2Approved = 'Yes' 
       AND level1Approved = 'No'`,
      {
        replacements: { id, approvedBy: approvedBy || 'System' },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    
    if (updated === 0) {
      return res.status(404).json({ success: false, message: 'PO not found or Level 2 not approved yet' });
    }
    
    res.json({ success: true, message: 'PO fully approved!' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Bulk Approve Level 1 (Final Approval)
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
    console.error('Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;