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
    console.log('✅ poDetailId column added to PurchaseGRNDetails.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  }
}

run();
