const { sequelize } = require('../model/index');

async function checkIds() {
  try {
    const [grnMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseGRNs");
    const [detailMax] = await sequelize.query("SELECT MAX(id) as maxId FROM PurchaseGRNDetails");
    console.log("Max PurchaseGRN ID:", grnMax[0].maxId);
    console.log("Max PurchaseGRNDetail ID:", detailMax[0].maxId);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkIds();
