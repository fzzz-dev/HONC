const { sequelize } = require('../model/index');

async function testSelect() {
  try {
    const [results] = await sequelize.query("SELECT id, alGrnQty FROM purchaseorderdetails LIMIT 1");

    process.exit(0);
  } catch (e) {

    process.exit(1);
  }
}

testSelect();
