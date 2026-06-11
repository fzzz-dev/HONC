const sequelize = require('../config/database');

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
        a.remarks,
        a.totalqty, 
        a.totalitems, 
        c.indentQty,
        c.uom,
        c.duedate,
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

const exportToCSV = async (req, res) => {
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
        c.duedate as 'Due Date',
        a.status as 'Status',
        a.remarks as 'Remarks'
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
    
    for (const row of results) {
      // Format the due date for CSV
      let dueDate = row['Due Date'] || '';
      if (dueDate) {
        const dateObj = new Date(dueDate);
        if (!isNaN(dateObj.getTime())) {
          dueDate = dateObj.toLocaleDateString('en-IN');
        }
      }
      
      const values = [
        `"${(row['Indent No'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Date'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Department'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Category'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Item Description'] || '').toString().replace(/"/g, '""')}"`,
        row['Indent Qty'] || 0,
        `"${(row['UOM'] || '').toString().replace(/"/g, '""')}"`,
        `"${dueDate}"`,
        `"${(row['Status'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Remarks'] || '').toString().replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_indent_report.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Get summary statistics
const getReportSummary = async (req, res) => {
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

// Export ALL three functions
module.exports = { getPurchaseIndentReport, exportToCSV, getReportSummary };