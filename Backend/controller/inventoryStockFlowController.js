const sequelize = require('../config/database');

// Get Inventory Stock Flow Report
const getInventoryStockFlowReport = async (req, res) => {
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
        SUM(a.opstk) + SUM(a.recqty) - SUM(a.issqty) AS clsstk,
        SUM(a.stkqty) AS stkqty
      FROM (
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          SUM(a.recqty) - SUM(a.issqty) AS opstk, 
          0 AS recqty, 
          0 AS issqty,
          0 AS stkqty
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
          0 AS opstk, 
          SUM(a.recqty) AS recqty, 
          SUM(a.issqty) AS issqty,
          SUM(a.recqty) - SUM(a.issqty) AS stkqty
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
    
    const [results] = await sequelize.query(query, { replacements });
    
    const mappedResults = results.map(row => ({
      storename: row.storename,
      maincat: row.maincat,
      itemdescription: row.itemdescription,
      opstk: row.opstk || 0,
      recqty: row.recqty || 0,
      isstqy: row.isstqy || 0,
      clsstk: row.clsstk || 0,
      stkqty: row.stkqty || 0
    }));
    
    res.json({
      success: true,
      data: mappedResults,
      count: mappedResults.length
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Export to CSV
const exportToCSV = async (req, res) => {
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
        SUM(a.opstk) + SUM(a.recqty) - SUM(a.issqty) AS clsstk,
        SUM(a.stkqty) AS stkqty
      FROM (
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          SUM(a.recqty) - SUM(a.issqty) AS opstk, 
          0 AS recqty, 
          0 AS issqty,
          0 AS stkqty
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
          0 AS opstk, 
          SUM(a.recqty) AS recqty, 
          SUM(a.issqty) AS issqty,
          SUM(a.recqty) - SUM(a.issqty) AS stkqty
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
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
    const headers = ['Store Name', 'Main Category', 'Item Description', 'Opening Stock', 'Received Qty', 'Issued Qty', 'Closing Stock', 'Current Stock'];
    const csvRows = [headers.join(',')];
    
    for (const row of results) {
      const values = [
        `"${(row.storename || '').toString().replace(/"/g, '""')}"`,
        `"${(row.maincat || '').toString().replace(/"/g, '""')}"`,
        `"${(row.itemdescription || '').toString().replace(/"/g, '""')}"`,
        row.opstk || 0,
        row.recqty || 0,
        row.isstqy || 0,
        row.clsstk || 0,
        row.stkqty || 0
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
};

// Get Summary Statistics
const getReportSummary = async (req, res) => {
  try {
    const { fromDate, toDate } = req.query;
    
    let query = `
      SELECT 
        COUNT(DISTINCT CONCAT(a.storename, a.maincat, a.itemdescription)) AS totalItems,
        SUM(a.opstk) AS totalOpeningStock,
        SUM(a.recqty) AS totalReceived,
        SUM(a.issqty) AS totalIssued,
        SUM(a.opstk) + SUM(a.recqty) - SUM(a.issqty) AS totalClosingStock,
        SUM(a.stkqty) AS totalCurrentStock
      FROM (
        SELECT 
          a.storename, 
          a.maincat, 
          a.itemdescription, 
          SUM(a.recqty) - SUM(a.issqty) AS opstk, 
          0 AS recqty, 
          0 AS issqty,
          0 AS stkqty
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
          0 AS opstk, 
          SUM(a.recqty) AS recqty, 
          SUM(a.issqty) AS issqty,
          SUM(a.recqty) - SUM(a.issqty) AS stkqty
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
    
    const [results] = await sequelize.query(query, { replacements });
    
    const summary = {
      totalItems: Number(results[0]?.totalItems) || 0,
      totalOpeningStock: Number(results[0]?.totalOpeningStock) || 0,
      totalReceived: Number(results[0]?.totalReceived) || 0,
      totalIssued: Number(results[0]?.totalIssued) || 0,
      totalClosingStock: Number(results[0]?.totalClosingStock) || 0,
      totalCurrentStock: Number(results[0]?.totalCurrentStock) || 0
    };
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Get available date range
const getDateRange = async (req, res) => {
  try {
    const query = `
      SELECT 
        MIN(date) AS minDate,
        MAX(date) AS maxDate
      FROM v_item_stock_new
    `;
    
    const [results] = await sequelize.query(query);
    
    res.json({
      success: true,
      data: {
        minDate: results[0]?.minDate || null,
        maxDate: results[0]?.maxDate || null
      }
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Current Stock - Using itemdescription and storename
const getCurrentStock = async (req, res) => {
  try {
    const { asOfDate, itemName, storeName } = req.query;
    
    let query = `
      SELECT 
        storename,
        maincat,
        itemdescription,
        SUM(recqty) - SUM(issqty) AS stkqty
      FROM v_item_stock_new
      WHERE 1=1
    `;
    
    const replacements = {};
    
    if (asOfDate) {
      query += ` AND date <= :asOfDate`;
      replacements.asOfDate = asOfDate;
    }
    
    if (itemName) {
      query += ` AND itemdescription = :itemName`;
      replacements.itemName = itemName;
    }
    
    if (storeName) {
      query += ` AND storename = :storeName`;
      replacements.storeName = storeName;
    }
    
    query += `
      GROUP BY storename, maincat, itemdescription
      ORDER BY storename, maincat, itemdescription
    `;
    
    const [results] = await sequelize.query(query, { replacements });
    
    // If specific item and store requested, return single value
    if (itemName && storeName) {
      const stock = results[0] || { stkqty: 0 };
      return res.json({
        success: true,
        data: {
          stkqty: Number(stock.stkqty || 0).toFixed(3)
        }
      });
    }
    
    const mappedResults = results.map(row => ({
      storename: row.storename,
      maincat: row.maincat,
      itemdescription: row.itemdescription,
      stkqty: Number(row.stkqty || 0).toFixed(3)
    }));
    
    res.json({
      success: true,
      data: mappedResults,
      count: mappedResults.length
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Get stock for multiple items - Using itemdescription and storename
const getStockForItems = async (req, res) => {
  try {
    const { storeName, itemNames, asOfDate } = req.query;
    
    if (!storeName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Store name is required' 
      });
    }
    
    let itemNameList = [];
    if (itemNames) {
      itemNameList = itemNames.split(',');
    }
    
    let query = `
      SELECT 
        itemdescription,
        SUM(recqty) - SUM(issqty) AS stkqty
      FROM v_item_stock_new
      WHERE storename = :storeName
    `;
    
    const replacements = { storeName };
    
    if (asOfDate) {
      query += ` AND date <= :asOfDate`;
      replacements.asOfDate = asOfDate;
    }
    
    if (itemNameList.length > 0) {
      query += ` AND itemdescription IN (:itemNames)`;
      replacements.itemNames = itemNameList;
    }
    
    query += `
      GROUP BY itemdescription
      ORDER BY itemdescription
    `;
    
    const [results] = await sequelize.query(query, { replacements });
    
    const stockMap = {};
    results.forEach(row => {
      stockMap[row.itemdescription] = Number(row.stkqty || 0).toFixed(3);
    });
    
    res.json({
      success: true,
      data: stockMap,
      count: results.length
    });
  } catch (error) {

    res.status(500).json({ success: false, message: error.message });
  }
};

// Export all functions
module.exports = { 
  getInventoryStockFlowReport, 
  exportToCSV, 
  getReportSummary,
  getDateRange,
  getCurrentStock,
  getStockForItems  
};