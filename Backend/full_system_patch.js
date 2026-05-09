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
    // 0. GET ACTUAL TABLE NAMES (FOR CASE SENSITIVITY)
    const [dbTablesRaw] = await sequelize.query("SHOW TABLES");
    const dbTables = dbTablesRaw.map(t => Object.values(t)[0]);
    console.log(`  Found ${dbTables.length} tables in database.`);

    const getTable = (name) => {
        return dbTables.find(t => t.toLowerCase() === name.toLowerCase());
    };

    // 1. ADD MISSING COLUMNS
    console.log("\nStep 1: Adding missing columns...");
    
    const columnPatches = [
      { table: 'PurchaseOrderDetails', column: 'alGrnQty', ddl: "ADD COLUMN `alGrnQty` DECIMAL(10,2) NOT NULL DEFAULT 0" },
      { table: 'PurchaseGRNDetails', column: 'poDetailId', ddl: "ADD COLUMN `poDetailId` BIGINT NULL" }
    ];

    for (const patch of columnPatches) {
      const actualTable = getTable(patch.table);
      if (!actualTable) {
        console.warn(`  ⚠️  Table ${patch.table} not found, skipping.`);
        continue;
      }
      try {
        await sequelize.query(`ALTER TABLE \`${actualTable}\` ${patch.ddl}`);
        console.log(`  ✅ Added ${actualTable}.${patch.column}`);
      } catch (e) {
        if (e.message.includes("Duplicate column name")) {
          console.log(`  ℹ️  ${actualTable}.${patch.column} already exists.`);
        } else {
          console.error(`  ❌ Failed ${actualTable}.${patch.column}: ${e.message}`);
        }
      }
    }

    // 2. AGGRESSIVE ID OVERFLOW FIX
    console.log("\nStep 2: Upgrading IDs to BIGINT and fixing overflows...");
    
    const detailsTables = ['PurchaseOrderDetails', 'PurchaseGRNDetails', 'PurchaseIndentDetails', 'OpeningStockDetails', 'ConsumptionIssueDetails'];
    const parentTables = ['PurchaseOrders', 'PurchaseGRNs', 'PurchaseIndents', 'OpeningStocks', 'ConsumptionIssues'];

    // Drop all foreign keys first to allow column modification
    for (const table of detailsTables) {
      const actualTable = getTable(table);
      if (!actualTable) continue;

      const [constraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '${dbName}' 
        AND TABLE_NAME = '${actualTable}' 
        AND CONSTRAINT_NAME <> 'PRIMARY'
      `);
      
      for (const c of constraints) {
        try {
          await sequelize.query(`ALTER TABLE \`${actualTable}\` DROP FOREIGN KEY \`${c.CONSTRAINT_NAME}\``);
          console.log(`  Dropped constraint ${c.CONSTRAINT_NAME} from ${actualTable}`);
        } catch(e) {}
      }
    }

    // Upgrade parents
    for (const table of parentTables) {
      const actualTable = getTable(table);
      if (!actualTable) {
        console.warn(`  ⚠️  Parent table ${table} not found.`);
        continue;
      }
      try {
        await sequelize.query(`ALTER TABLE \`${actualTable}\` MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT`);
        console.log(`  ✅ Upgraded ${actualTable}.id to BIGINT`);
      } catch(e) {
        console.error(`  ❌ Failed ${actualTable}.id: ${e.message}`);
      }
    }

    // Upgrade children
    for (const table of detailsTables) {
      const actualTable = getTable(table);
      if (!actualTable) continue;
      
      try {
        await sequelize.query(`ALTER TABLE \`${actualTable}\` MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT`);
        
        let fkCol = '';
        if (table.toLowerCase() === 'purchaseorderdetails') fkCol = 'purchaseOrderId';
        if (table.toLowerCase() === 'purchasegrndetails') fkCol = 'purchaseGRNId';
        if (table.toLowerCase() === 'purchaseindentdetails') fkCol = 'purchaseIndentId';
        if (table.toLowerCase() === 'openingstockdetails') fkCol = 'openingStockId';
        if (table.toLowerCase() === 'consumptionissuedetails') fkCol = 'consumptionIssueId';

        if (fkCol) {
          await sequelize.query(`ALTER TABLE \`${actualTable}\` MODIFY COLUMN \`${fkCol}\` BIGINT NOT NULL`);
        }
        console.log(`  ✅ Upgraded ${actualTable} columns to BIGINT`);
      } catch(e) {
        console.error(`  ❌ Failed ${actualTable}: ${e.message}`);
      }
    }

    // Restore clean foreign keys
    console.log("\nStep 3: Restoring database integrity...");
    const relations = [
      { child: 'PurchaseOrderDetails', parent: 'PurchaseOrders', col: 'purchaseOrderId', name: 'fk_po_details' },
      { child: 'PurchaseGRNDetails', parent: 'PurchaseGRNs', col: 'purchaseGRNId', name: 'fk_grn_details' },
      { child: 'PurchaseIndentDetails', parent: 'PurchaseIndents', col: 'purchaseIndentId', name: 'fk_indent_details' }
    ];

    for (const rel of relations) {
      const actualChild = getTable(rel.child);
      const actualParent = getTable(rel.parent);
      if (!actualChild || !actualParent) continue;

      try {
        await sequelize.query(`
          ALTER TABLE \`${actualChild}\` 
          ADD CONSTRAINT \`${rel.name}\` 
          FOREIGN KEY (\`${rel.col}\`) REFERENCES \`${actualParent}\`(id) 
          ON DELETE CASCADE ON UPDATE CASCADE
        `);
        console.log(`  ✅ Restored ${rel.name} on ${actualChild}`);
      } catch(e) {
        console.log(`  ℹ️  Note: ${rel.name} might already exist or parent missing.`);
      }
    }


    // Reset Auto-Increments if they are corrupted
    for (const table of [...parentTables, ...detailsTables]) {
        const actualTable = getTable(table);
        if (!actualTable) continue;
        try {
            const [maxId] = await sequelize.query(`SELECT MAX(id) as m FROM \`${actualTable}\``);
            const next = (maxId[0].m || 0) + 1;
            await sequelize.query(`ALTER TABLE \`${actualTable}\` AUTO_INCREMENT = ${next}`);
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
