const { PurchaseIndent, PurchaseIndentDetail, sequelize } = require('../model/index');

async function check() {
  try {
    const [headerMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseIndents");
    const [detailMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseIndentDetails");
    
    console.log("PurchaseIndents Max ID:", headerMax[0].maxId);
    console.log("PurchaseIndentDetails Max ID:", detailMax[0].maxId);
    
    // Check auto_increment status
    const [status] = await sequelize.query("SHOW TABLE STATUS WHERE Name IN ('PurchaseIndents', 'PurchaseIndentDetails')");
    status.forEach(table => {
      console.log(`Table: ${table.Name}, Auto_increment: ${table.Auto_increment}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
