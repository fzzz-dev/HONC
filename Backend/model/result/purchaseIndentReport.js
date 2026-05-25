const sequelize = require('../config/database');

// Get Purchase Indent Report with filters
const getPurchaseIndentReport = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, category, status, departmentId } = req.query;
    
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
    
    if (category) {
      query += ` AND d.groupName = :category`;
      replacements.category = category;
    }
    
    if (status && status !== 'All') {
      query += ` AND a.status = :status`;
      replacements.status = status;
    }
    
    if (departmentId) {
      query += ` AND a.departmentid = :departmentId`;
      replacements.departmentId = departmentId;
    }
    
    query += ` ORDER BY a.date, a.indentNo, c.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error fetching purchase indent report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report data',
      error: error.message
    });
  }
};

// Export to CSV
const exportToCSV = async (req, res) => {
  try {
    const { fromDate, toDate, searchTerm, category, status, departmentId } = req.query;
    
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
    
    if (category) {
      query += ` AND d.groupName = :category`;
      replacements.category = category;
    }
    
    if (status && status !== 'All') {
      query += ` AND a.status = :status`;
      replacements.status = status;
    }
    
    if (departmentId) {
      query += ` AND a.departmentid = :departmentId`;
      replacements.departmentId = departmentId;
    }
    
    query += ` ORDER BY a.date, a.indentNo, c.id`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
    const headers = Object.keys(results[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of results) {
      const values = headers.map(header => {
        let value = row[header] !== null && row[header] !== undefined ? String(row[header]) : '';
        // Format date for Due Date column
        if (header === 'Due Date' && value) {
          value = new Date(value).toLocaleDateString('en-IN');
        }
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=purchase_indent_report.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: error.message
    });
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
    console.error('Error fetching report summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report summary',
      error: error.message
    });
  }
};

module.exports = {
  getPurchaseIndentReport,
  exportToCSV,
  getReportSummary
};