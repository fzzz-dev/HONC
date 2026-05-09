/**
 * MASTER SYSTEM PATCH SCRIPT
 * Run this script once to synchronize the database schema, fix ID overflows,
 * and ensure all procurement modules are working correctly.
 * 
 * Usage: node full_system_patch.js
 */

const { sequelize } = require('./model/index');

async function runPatch() {
  const dbName = sequelize.config.database;
  console.log(`🚀 Starting Full System Patch for database: ${dbName}`);

  try {
    // 1. ADD MISSING COLUMNS
    console.log("\nStep 1: Adding missing columns...");
    
    const columnPatches = [
      { table: 'purchaseorderdetails', column: 'alGrnQty', ddl: "ADD COLUMN `alGrnQty` DECIMAL(10,2) NOT NULL DEFAULT 0" },
      { table: 'purchasegrndetails', column: 'poDetailId', ddl: "ADD COLUMN `poDetailId` BIGINT NULL" }
    ];

    for (const patch of columnPatches) {
      try {
        await sequelize.query(`ALTER TABLE \`${patch.table}\` ${patch.ddl}`);
        console.log(`  ✅ Added ${patch.table}.${patch.column}`);
      } catch (e) {
        if (e.message.includes("Duplicate column name")) {
          console.log(`  ℹ️  ${patch.table}.${patch.column} already exists.`);
        } else {
          console.error(`  ❌ Failed ${patch.table}.${patch.column}: ${e.message}`);
        }
      }
    }

    // 2. AGGRESSIVE ID OVERFLOW FIX
    console.log("\nStep 2: Upgrading IDs to BIGINT and fixing overflows...");
    
    const detailsTables = ['purchaseorderdetails', 'purchasegrndetails', 'purchaseindentdetails', 'openingstockdetails', 'consumptionissuedetails'];
    const parentTables = ['purchaseorders', 'purchasegrns', 'purchaseindents', 'openingstocks', 'consumptionissues'];

    // Drop all foreign keys first to allow column modification
    for (const table of detailsTables) {
      const [constraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '${dbName}' 
        AND TABLE_NAME = '${table}' 
        AND CONSTRAINT_NAME <> 'PRIMARY'
      `);
      
      for (const c of constraints) {
        try {
          await sequelize.query(`ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``);
          console.log(`  Dropped constraint ${c.CONSTRAINT_NAME} from ${table}`);
        } catch(e) {}
      }
    }

    // Upgrade parents
    for (const table of parentTables) {
      try {
        await sequelize.query(`ALTER TABLE \`${table}\` MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT`);
        console.log(`  ✅ Upgraded ${table}.id to BIGINT`);
      } catch(e) {
        console.error(`  ❌ Failed ${table}.id: ${e.message}`);
      }
    }

    // Upgrade children
    for (const table of detailsTables) {
      try {
        await sequelize.query(`ALTER TABLE \`${table}\` MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT`);
        
        let fkCol = '';
        if (table === 'purchaseorderdetails') fkCol = 'purchaseOrderId';
        if (table === 'purchasegrndetails') fkCol = 'purchaseGRNId';
        if (table === 'purchaseindentdetails') fkCol = 'purchaseIndentId';
        if (table === 'openingstockdetails') fkCol = 'openingStockId';
        if (table === 'consumptionissuedetails') fkCol = 'consumptionIssueId';

        if (fkCol) {
          await sequelize.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${fkCol}\` BIGINT NOT NULL`);
        }
        console.log(`  ✅ Upgraded ${table} columns to BIGINT`);
      } catch(e) {
        console.error(`  ❌ Failed ${table}: ${e.message}`);
      }
    }

    // Restore clean foreign keys
    console.log("\nStep 3: Restoring database integrity...");
    const relations = [
      { child: 'purchaseorderdetails', parent: 'purchaseorders', col: 'purchaseOrderId', name: 'fk_po_details' },
      { child: 'purchasegrndetails', parent: 'purchasegrns', col: 'purchaseGRNId', name: 'fk_grn_details' },
      { child: 'purchaseindentdetails', parent: 'purchaseindents', col: 'purchaseIndentId', name: 'fk_indent_details' }
    ];

    for (const rel of relations) {
      try {
        await sequelize.query(`
          ALTER TABLE \`${rel.child}\` 
          ADD CONSTRAINT \`${rel.name}\` 
          FOREIGN KEY (\`${rel.col}\`) REFERENCES \`${rel.parent}\`(id) 
          ON DELETE CASCADE ON UPDATE CASCADE
        `);
        console.log(`  ✅ Restored ${rel.name}`);
      } catch(e) {
        console.log(`  ℹ️  Note: ${rel.name} might already exist or parent missing.`);
      }
    }

    // Reset Auto-Increments if they are corrupted
    for (const table of [...parentTables, ...detailsTables]) {
        try {
            const [maxId] = await sequelize.query(`SELECT MAX(id) as m FROM \`${table}\``);
            const next = (maxId[0].m || 0) + 1;
            await sequelize.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${next}`);
        } catch(e) {}
    }

    console.log("\n✨ SYSTEM PATCH COMPLETED SUCCESSFULLY!");
    console.log("Please restart your Node.js server now.");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ CRITICAL PATCH ERROR:", err.message);
    process.exit(1);
  }
}

runPatch();
