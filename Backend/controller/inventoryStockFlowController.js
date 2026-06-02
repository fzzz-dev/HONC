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
    
    const [results] = await sequelize.query(query, { replacements });
    
    // Map the results to match frontend expectations
    const mappedResults = results.map(row => ({
      storename: row.storename,
      maincat: row.maincat,
      itemdescription: row.itemdescription,
      opstk: row.opstk || 0,
      recqty: row.recqty || 0,
      isstqy: row.isstqy || 0,
      clsstk: row.clsstk || 0
    }));
    
    res.json({
      success: true,
      data: mappedResults,
      count: mappedResults.length
    });
  } catch (error) {
    console.error('Error in getInventoryStockFlowReport:', error);
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
    
    const [results] = await sequelize.query(query, { replacements });
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No data to export' });
    }
    
    // CSV headers matching frontend expectations
    const headers = ['Store Name', 'Main Category', 'Item Description', 'Opening Stock', 'Received Qty', 'Issued Qty', 'Closing Stock'];
    const csvRows = [headers.join(',')];
    
    for (const row of results) {
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
    console.error('Error in exportToCSV:', error);
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
    
    const [results] = await sequelize.query(query, { replacements });
    
    // Map to frontend expected field names
    const summary = {
      totalItems: Number(results[0]?.totalItems) || 0,
      totalOpeningStock: Number(results[0]?.totalOpeningStock) || 0,
      totalReceived: Number(results[0]?.totalReceived) || 0,
      totalIssued: Number(results[0]?.totalIssued) || 0,
      totalClosingStock: Number(results[0]?.totalClosingStock) || 0
    };
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error in getReportSummary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get available date range (min and max dates from data)
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
    console.error('Error in getDateRange:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  getInventoryStockFlowReport, 
  exportToCSV, 
  getReportSummary,
  getDateRange
};