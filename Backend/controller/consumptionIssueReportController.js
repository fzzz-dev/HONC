const sequelize = require("../config/database");

// Get Consumption Issue Report with filters
const getConsumptionIssueReport = async (req, res) => {
  try {
    const { fromDate, toDate, searchISSNo, searchItem, department, store } = req.query;
    
    let query = `
      SELECT 
        issno,
        issuedate,
        department,
        store,
        requestedby,
        remarks,
        totalqty,
        totalitems,
        itemname,
        stkqty,
        issueqty,
        uom,
        balqty,
        itemremarks
      FROM consumptionissueresult
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND issuedate >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND issuedate <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchISSNo) {
      query += ` AND issno LIKE :searchISSNo`;
      replacements.searchISSNo = `%${searchISSNo}%`;
    }
    
    if (searchItem) {
      query += ` AND itemname LIKE :searchItem`;
      replacements.searchItem = `%${searchItem}%`;
    }
    
    if (department) {
      query += ` AND department = :department`;
      replacements.department = department;
    }
    
    if (store) {
      query += ` AND store = :store`;
      replacements.store = store;
    }
    
    query += ` ORDER BY issuedate DESC, issno`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error("Error in getConsumptionIssueReport:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export Consumption Issue Report to CSV
const exportConsumptionIssueReportCSV = async (req, res) => {
  try {
    const { fromDate, toDate, searchISSNo, searchItem, department, store } = req.query;
    
    let query = `
      SELECT 
        issno AS 'ISS No',
        issuedate AS 'Issue Date',
        department AS 'Department',
        store AS 'Store',
        requestedby AS 'Requested By',
        remarks AS 'Remarks',
        totalqty AS 'Total Qty',
        totalitems AS 'Total Items',
        itemname AS 'Item Name',
        stkqty AS 'Stock Qty',
        issueqty AS 'Issue Qty',
        uom AS 'UOM',
        balqty AS 'Balance Qty',
        itemremarks AS 'Item Remarks'
      FROM consumptionissueresult
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (fromDate) {
      query += ` AND issuedate >= :fromDate`;
      replacements.fromDate = fromDate;
    }
    
    if (toDate) {
      query += ` AND issuedate <= :toDate`;
      replacements.toDate = toDate;
    }
    
    if (searchISSNo) {
      query += ` AND issno LIKE :searchISSNo`;
      replacements.searchISSNo = `%${searchISSNo}%`;
    }
    
    if (searchItem) {
      query += ` AND itemname LIKE :searchItem`;
      replacements.searchItem = `%${searchItem}%`;
    }
    
    if (department) {
      query += ` AND department = :department`;
      replacements.department = department;
    }
    
    if (store) {
      query += ` AND store = :store`;
      replacements.store = store;
    }
    
    query += ` ORDER BY issuedate DESC, issno`;
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: "No data to export" });
    }
    
    const headers = ['ISS No', 'Issue Date', 'Department', 'Store', 'Requested By', 'Remarks', 'Total Qty', 'Total Items', 'Item Name', 'Stock Qty', 'Issue Qty', 'UOM', 'Balance Qty', 'Item Remarks'];
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
        `"${(row['ISS No'] || '').toString().replace(/"/g, '""')}"`,
        `"${formatDate(row['Issue Date'])}"`,
        `"${(row['Department'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Store'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Requested By'] || '').toString().replace(/"/g, '""')}"`,
        `"${(row['Remarks'] || '').toString().replace(/"/g, '""')}"`,
        row['Total Qty'] || 0,
        row['Total Items'] || 0,
        `"${(row['Item Name'] || '').toString().replace(/"/g, '""')}"`,
        row['Stock Qty'] || 0,
        row['Issue Qty'] || 0,
        `"${(row['UOM'] || '').toString().replace(/"/g, '""')}"`,
        row['Balance Qty'] || 0,
        `"${(row['Item Remarks'] || '').toString().replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    }
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=consumption_issue_report.csv');
    const BOM = '\uFEFF';
    res.send(BOM + csvRows.join('\n'));
    
  } catch (error) {
    console.error("Error in exportConsumptionIssueReportCSV:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get distinct departments for filter dropdown
const getDistinctDepartments = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT department 
      FROM consumptionissueresult 
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `;
    
    const [results] = await sequelize.query(query);
    const departments = results.map(row => row.department);
    
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error("Error in getDistinctDepartments:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get distinct stores for filter dropdown
const getDistinctStores = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT store 
      FROM consumptionissueresult 
      WHERE store IS NOT NULL AND store != ''
      ORDER BY store
    `;
    
    const [results] = await sequelize.query(query);
    const stores = results.map(row => row.store);
    
    res.json({ success: true, data: stores });
  } catch (error) {
    console.error("Error in getDistinctStores:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getConsumptionIssueReport,
  exportConsumptionIssueReportCSV,
  getDistinctDepartments,
  getDistinctStores
};