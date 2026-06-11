const { PurchaseIndentDetail, PurchaseOrderDetail, sequelize } = require('../model/index');
const { Op } = require('sequelize');

async function fix() {
  try {
    const maxInt = 2147483647;
    const highRows = await PurchaseIndentDetail.findAll({
      where: { id: { [Op.gte]: maxInt - 100 } }
    });
    

    
    if (highRows.length > 0) {
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
      
      const [maxUsedRow] = await sequelize.query("SELECT MAX(id) as maxId FROM purchaseindentdetails WHERE id < 1000000");
      let nextSafeId = (maxUsedRow[0].maxId || 0) + 1;
      
      for (const row of highRows) {
        const oldId = row.id;
        const newId = nextSafeId++;
        

        
        // Update the row itself
        await sequelize.query(`UPDATE purchaseindentdetails SET id = ${newId} WHERE id = ${oldId}`);
        
        // Update references in PurchaseOrderDetails
        await sequelize.query(`UPDATE purchaseorderdetails SET indentDetailId = ${newId} WHERE indentDetailId = ${oldId}`);
      }
      
      // Reset auto_increment
      const [finalMax] = await sequelize.query("SELECT MAX(id) as maxId FROM purchaseindentdetails");
      const nextAuto = (finalMax[0].maxId || 0) + 1;
      await sequelize.query(`ALTER TABLE purchaseindentdetails AUTO_INCREMENT = ${nextAuto}`);
      
      await sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    } else {

      const [finalMax] = await sequelize.query("SELECT MAX(id) as maxId FROM purchaseindentdetails");
      const nextAuto = (finalMax[0].maxId || 0) + 1;
      await sequelize.query(`ALTER TABLE purchaseindentdetails AUTO_INCREMENT = ${nextAuto}`);

    }

    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

fix();
