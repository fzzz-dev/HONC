const { sequelize } = require('../model/index');

async function testSelect() {
  try {
    const [results] = await sequelize.query("SELECT id, alGrnQty FROM purchaseorderdetails LIMIT 1");
    console.log("Success! Results:", results);
    process.exit(0);
  } catch (e) {
    console.error("❌ SQL Error:", e.message);
    process.exit(1);
  }
}

testSelect();
