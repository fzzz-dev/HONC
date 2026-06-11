/**
 * One-time migration: add alGrnQty column to PurchaseOrderDetails if missing.
 */
const { sequelize } = require('../model/index');

async function run() {
  try {
    await sequelize.query(`
      ALTER TABLE PurchaseOrderDetails 
      ADD COLUMN IF NOT EXISTS alGrnQty DECIMAL(10,2) NOT NULL DEFAULT 0
    `);

    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

run();
