const { sequelize } = require('../model/index');

async function run() {
  try {
    const [results, metadata] = await sequelize.query("DESCRIBE PurchaseGRNDetails;");

    console.table(results);
    process.exit(0);
  } catch (e) {

    process.exit(1);
  }
}

run();
