const sequelize = require('../config/database');

// ==================== PURCHASE GRN REPORT ====================
const getPurchaseGRNReport = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchGRNNo, supplier, poNo } = req.query;
    
    let query = `
      SELECT 
        pg.grnNo,
        pg.date AS grnDate,
        s.supplierName AS supplierName,
        pg.invoiceNo,
        po.poNo AS poNo,
        pi.indentNo AS indentNo,
        i.itemName AS itemName,
        u.name AS uom,
        pgd.grnQty,
        pgd.phyQty,
        pgd.grnRate,
        pgd.discPct,
        pgd.totGst,
        pgd.totalAmount AS detailTotalAmount
      FROM purchasegrns pg 
      LEFT JOIN purchasegrndetails pgd ON pg.id = pgd.purchaseGRNId
      LEFT JOIN suppliers s ON pg.supplierId = s.id
      LEFT JOIN purchaseorders po ON pgd.poNo = po.poNo
      LEFT JOIN purchaseindents pi ON pgd.indentNo = pi.indentNo
      LEFT JOIN items i ON pgd.itemId = i.id
      LEFT JOIN uoms u ON i.uom = u.id
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
      query += ` AND (i.itemName LIKE :searchTerm OR pi.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND s.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    if (poNo) {
      query += ` AND po.poNo LIKE :poNo`;
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
};

const exportGRNToCSV = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchGRNNo, supplier, poNo } = req.query;
    
    let query = `
      SELECT 
        pg.grnNo AS 'GRN No',
        pg.date AS 'GRN Date',
        s.supplierName AS 'Supplier',
        pg.invoiceNo AS 'Invoice No',
        po.poNo AS 'PO No',
        pi.indentNo AS 'Indent No',
        i.itemName AS 'Item Name',
        u.name AS 'UOM',
        pgd.grnQty AS 'GRN Qty',
        pgd.phyQty AS 'Physical Qty',
        pgd.grnRate AS 'Rate',
        pgd.discPct AS 'Discount %',
        pgd.totGst AS 'Total GST',
        pgd.totalAmount AS 'Total Amount'
      FROM purchasegrns pg 
      LEFT JOIN purchasegrndetails pgd ON pg.id = pgd.purchaseGRNId
      LEFT JOIN suppliers s ON pg.supplierId = s.id
      LEFT JOIN purchaseorders po ON pgd.poNo = po.poNo
      LEFT JOIN purchaseindents pi ON pgd.indentNo = pi.indentNo
      LEFT JOIN items i ON pgd.itemId = i.id
      LEFT JOIN uoms u ON i.uom = u.id
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
      query += ` AND (i.itemName LIKE :searchTerm OR pi.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND s.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    if (poNo) {
      query += ` AND po.poNo LIKE :poNo`;
      replacements.poNo = `%${poNo}%`;
    }
    
    query += ` ORDER BY pg.date DESC, pg.grnNo, pgd.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
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
};

const getGRNReportSummary = async (req, res) => {
  try {
    const { fromDate, toDate, supplier } = req.query;
    
    let query = `
      SELECT 
        COUNT(DISTINCT pg.id) AS totalGRNs,
        SUM(pgd.grnQty) AS totalQuantity,
        SUM(pgd.totGst) AS totalGST,
        SUM(pgd.totalAmount) AS totalAmount
      FROM purchasegrns pg 
      LEFT JOIN purchasegrndetails pgd ON pg.id = pgd.purchaseGRNId
      LEFT JOIN suppliers s ON pg.supplierId = s.id
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
    
    if (supplier) {
      query += ` AND s.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results[0] || {}
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PURCHASE INDENT REPORT ====================
const getPurchaseIndentReport = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, category, status, searchIndentNo, departmentId } = req.query;
    
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
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND a.date >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND a.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchTerm) {
      query += ` AND e.itemDescription LIKE :searchTerm`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (searchIndentNo) {
      query += ` AND a.indentno LIKE :searchIndentNo`;
      replacements.searchIndentNo = `%${searchIndentNo}%`;
    }
    
    if (category) {
      query += ` AND d.groupName = :category`;
      replacements.category = category;
    }
    
    if (departmentId) {
      query += ` AND a.departmentid = :departmentId`;
      replacements.departmentId = departmentId;
    }
    
    if (status && status !== 'All') {
      query += ` AND a.status = :status`;
      replacements.status = status;
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
};

const exportIndentToCSV = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, category, status, searchIndentNo, departmentId } = req.query;
    
    let query = `
      SELECT 
        a.indentno as 'Indent No', 
        a.date as 'Date', 
        b.name as 'Department', 
        d.groupName as 'Category', 
        e.itemDescription as 'Item Description', 
        c.indentQty as 'Indent Qty',
        c.uom as 'UOM',
        c.dueDate as 'Due Date',
        a.status as 'Status',
        c.remarks as 'Remarks'
      FROM purchaseindents a 
      JOIN departments b ON a.departmentid = b.id 
      JOIN purchaseindentdetails c ON a.id = c.purchaseIndentId 
      JOIN maincategories d ON c.mainCategoryId = d.id 
      JOIN items e ON c.itemId = e.id 
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND a.date >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND a.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchTerm) {
      query += ` AND e.itemDescription LIKE :searchTerm`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (searchIndentNo) {
      query += ` AND a.indentno LIKE :searchIndentNo`;
      replacements.searchIndentNo = `%${searchIndentNo}%`;
    }
    
    if (category) {
      query += ` AND d.groupName = :category`;
      replacements.category = category;
    }
    
    if (departmentId) {
      query += ` AND a.departmentid = :departmentId`;
      replacements.departmentId = departmentId;
    }
    
    if (status && status !== 'All') {
      query += ` AND a.status = :status`;
      replacements.status = status;
    }
    
    query += ` ORDER BY a.date, a.indentNo, c.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
    const headers = ['Indent No', 'Date', 'Department', 'Category', 'Item Description', 'Indent Qty', 'UOM', 'Due Date', 'Status', 'Remarks'];
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
        `"${(row['Indent No'] || '').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['Date'])}"`,
        `"${(row['Department'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Category'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Item Description'] || '').toString().replace(/"/g, '""')}"`,
        row['Indent Qty'] || 0,
        `"${(row['UOM'] || '').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['Due Date'])}"`,
        `"${(row['Status'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Remarks'] || '').toString().replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_indent_report.csv');
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

const getIndentReportSummary = async (req, res) => {
  try {
    const { fromDate, toDate, departmentId } = req.query;
    
    let query = `
      SELECT 
        COUNT(DISTINCT a.id) AS totalIndents,
        COUNT(DISTINCT c.id) AS totalItems,
        SUM(c.indentQty) AS totalQuantity,
        COUNT(DISTINCT CASE WHEN a.status = 'Open' THEN a.id END) AS openIndents,
        COUNT(DISTINCT CASE WHEN a.status = 'Approved' THEN a.id END) AS approvedIndents,
        COUNT(DISTINCT CASE WHEN a.status = 'Closed' THEN a.id END) AS closedIndents,
        MIN(a.date) AS earliestIndentDate,
        MAX(a.date) AS latestIndentDate
      FROM purchaseindents a 
      JOIN purchaseindentdetails c ON a.id = c.purchaseIndentId
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND a.date >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND a.date <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (departmentId) {
      query += ` AND a.departmentid = :departmentId`;
      replacements.departmentId = departmentId;
    }
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results[0] || {}
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PURCHASE ORDER REPORT (UPDATED) ====================
const getPurchaseOrderReport = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchPONo, supplier } = req.query;
    
    let query = `
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
        pod.poAmount AS poamt,
        pod.poRate AS porate,
        pod.discPrice AS discPrice,
        pod.totGst AS totGst,
        pod.totalAmount AS totalAmount
      FROM purchaseorders po 
      LEFT JOIN purchaseorderdetails pod ON po.id = pod.purchaseOrderId
      LEFT JOIN suppliers s ON po.supplierId = s.id
      LEFT JOIN purchaseindents pi ON pod.indentNo = pi.indentNo
      LEFT JOIN items i ON pod.itemId = i.id
      LEFT JOIN uoms u ON pod.uom = u.name
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
      query += ` AND (i.itemName LIKE :searchTerm OR pi.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND s.supplierName = :supplier`;
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

    res.status(500).json({ success: false, message: error.message });
  }
};

const exportOrderToCSV = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, searchPONo, supplier } = req.query;
    
    let query = `
      SELECT 
        po.poNo AS 'PO Number',
        po.date AS 'PO Date',
        s.supplierName AS 'Supplier',
        po.deliveryDate AS 'Delivery Date',
        po.poType AS 'PO Type',
        pi.indentNo AS 'Indent No',
        i.itemName AS 'Item Name',
        u.name AS 'UOM',
        pod.poQty AS 'PO Qty',
        pod.poRate AS 'Rate',
        pod.discPrice AS 'Discount',
        pod.totGst AS 'GST',
        pod.totalAmount AS 'Total Amount'
      FROM purchaseorders po 
      LEFT JOIN purchaseorderdetails pod ON po.id = pod.purchaseOrderId
      LEFT JOIN suppliers s ON po.supplierId = s.id
      LEFT JOIN purchaseindents pi ON pod.indentNo = pi.indentNo
      LEFT JOIN items i ON pod.itemId = i.id
      LEFT JOIN uoms u ON pod.uom = u.name
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
      query += ` AND (i.itemName LIKE :searchTerm OR pi.indentNo LIKE :searchTerm)`;
      replacements.searchTerm = `%${searchTerm}%`;
    }
    
    if (supplier) {
      query += ` AND s.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    query += ` ORDER BY po.date DESC, po.poNo, pod.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
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

    res.status(500).json({ success: false, message: error.message });
  }
};

const getOrderReportSummary = async (req, res) => {
  try {
    const { fromDate, toDate, supplier } = req.query;
    
    let query = `
      SELECT 
        COUNT(DISTINCT po.id) AS totalOrders,
        SUM(pod.poQty) AS totalQuantity,
        SUM(pod.totalAmount) AS totalAmount,
        COUNT(DISTINCT CASE WHEN po.status = 'Open' THEN po.id END) AS openOrders,
        COUNT(DISTINCT CASE WHEN po.status = 'Closed' THEN po.id END) AS closedOrders,
        MIN(po.date) AS earliestOrderDate,
        MAX(po.date) AS latestOrderDate
      FROM purchaseorders po 
      LEFT JOIN purchaseorderdetails pod ON po.id = pod.purchaseOrderId
      LEFT JOIN suppliers s ON po.supplierId = s.id
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
    
    if (supplier) {
      query += ` AND s.supplierName = :supplier`;
      replacements.supplier = supplier;
    }
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results[0] || {}
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Export ALL functions
module.exports = { 
  getPurchaseIndentReport, 
  exportIndentToCSV, 
  getIndentReportSummary,
  getPurchaseOrderReport,
  exportOrderToCSV,
  getOrderReportSummary,
  getPurchaseGRNReport,
  exportGRNToCSV,
  getGRNReportSummary
};