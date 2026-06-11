/**
 * Migration: add poDetailId column to PurchaseGRNDetails if missing.
 */
const { sequelize } = require('../model/index');

async function run() {
  try {
    await sequelize.query(`
      ALTER TABLE PurchaseGRNDetails 
      ADD COLUMN IF NOT EXISTS poDetailId INTEGER NULL AFTER poId
    `);

    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

run();
