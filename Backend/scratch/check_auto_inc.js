const { sequelize } = require('../model/index');

async function run() {
  try {
    const [results] = await sequelize.query("SHOW CREATE TABLE PurchaseGRNDetails");
    console.log(results[0]['Create Table']);
    
    const [results2] = await sequelize.query("SHOW TABLE STATUS LIKE 'PurchaseGRNDetails'");
    console.log("Auto increment value:", results2[0].Auto_increment);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
