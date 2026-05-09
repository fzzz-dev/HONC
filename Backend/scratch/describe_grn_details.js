const { sequelize } = require('../model/index');

async function run() {
  try {
    const [results, metadata] = await sequelize.query("DESCRIBE PurchaseGRNDetails;");
    console.log("PurchaseGRNDetails Columns:");
    console.table(results);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
