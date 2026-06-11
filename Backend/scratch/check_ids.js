const { PurchaseIndent, PurchaseIndentDetail, sequelize } = require('../model/index');

async function check() {
  try {
    const [headerMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseIndents");
    const [detailMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseIndentDetails");
    


    
    // Check auto_increment status
    const [status] = await sequelize.query("SHOW TABLE STATUS WHERE Name IN ('PurchaseIndents', 'PurchaseIndentDetails')");
    status.forEach(table => {

    });

    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

check();
