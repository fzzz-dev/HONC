const { sequelize } = require('../model/index');

async function run() {
  try {
    const [results] = await sequelize.query("SHOW CREATE TABLE PurchaseGRNDetails");

    
    const [results2] = await sequelize.query("SHOW TABLE STATUS LIKE 'PurchaseGRNDetails'");

    
    process.exit(0);
  } catch (e) {

    process.exit(1);
  }
}

run();
