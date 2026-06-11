/**
 * One-time fix: update all PurchaseIndentDetail rows where
 * balQty = 0 AND alPoQty = 0 (meaning nothing was ever ordered).
 * These rows should have balQty = indentQty.
 */
const { sequelize } = require('../model/index');

async function fix() {
  try {
    const [results] = await sequelize.query(`
      UPDATE purchaseindentdetails
      SET balQty = indentQty
      WHERE alPoQty = 0 AND balQty = 0 AND indentQty > 0
    `);


    // Show current state
    const [rows] = await sequelize.query(`
      SELECT id, indentQty, alPoQty, balQty FROM purchaseindentdetails LIMIT 20
    `);
    console.table(rows);

    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

fix();
