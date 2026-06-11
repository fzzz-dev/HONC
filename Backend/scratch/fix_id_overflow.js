/**
 * Migration to fix "Out of range value for column 'id'" error.
 * Changes id columns to BIGINT and resets AUTO_INCREMENT for GRN tables.
 */
const { sequelize } = require('../model/index');

async function fixIds() {
  try {


    // 1. Fix PurchaseGRNDetails

    await sequelize.query("ALTER TABLE PurchaseGRNDetails MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    await sequelize.query("ALTER TABLE PurchaseGRNDetails AUTO_INCREMENT = 1");

    // 2. Fix PurchaseGRNs

    await sequelize.query("ALTER TABLE PurchaseGRNs MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    await sequelize.query("ALTER TABLE PurchaseGRNs AUTO_INCREMENT = 1");

    // 3. Fix PurchaseOrderDetails (just in case)

    try {
        await sequelize.query("ALTER TABLE PurchaseOrderDetails MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    } catch(e) { console.warn("Note: PurchaseOrderDetails patch skipped or already done."); }

    // 4. Fix PurchaseOrders

    try {
        await sequelize.query("ALTER TABLE PurchaseOrders MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    } catch(e) { console.warn("Note: PurchaseOrders patch skipped or already done."); }


    process.exit(0);
  } catch (e) {

    process.exit(1);
  }
}

fixIds();
