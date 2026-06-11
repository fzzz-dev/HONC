const { sequelize } = require('../model/index');

async function checkIds() {
  try {
    const [grnMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseGRNs");
    const [detailMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseGRNDetails");


    process.exit(0);
  } catch (e) {

    process.exit(1);
  }
}

checkIds();
