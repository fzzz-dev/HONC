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


  try {
    // 0. GET ACTUAL TABLE NAMES (FOR CASE SENSITIVITY)
    const [dbTablesRaw] = await sequelize.query("SHOW TABLES");
    const dbTables = dbTablesRaw.map(t => Object.values(t)[0]);


    const getTable = (name) => {
        return dbTables.find(t => t.toLowerCase() === name.toLowerCase());
    };

    // 1. ADD MISSING COLUMNS

    
    const columnPatches = [
      { table: 'PurchaseOrderDetails', column: 'alGrnQty', ddl: "ADD COLUMN `alGrnQty` DECIMAL(10,2) NOT NULL DEFAULT 0" },
      { table: 'PurchaseGRNDetails', column: 'poDetailId', ddl: "ADD COLUMN `poDetailId` BIGINT NULL" }
    ];

    for (const patch of columnPatches) {
      const actualTable = getTable(patch.table);
      if (!actualTable) {

        continue;
      }
      try {
        await sequelize.query(`ALTER TABLE \`${actualTable}\` ${patch.ddl}`);

      } catch (e) {
        if (e.message.includes("Duplicate column name")) {

        } else {

        }
      }
    }

    // 2. AGGRESSIVE ID OVERFLOW FIX

    
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

        } catch(e) {}
      }
    }

    // Upgrade parents
    for (const table of parentTables) {
      const actualTable = getTable(table);
      if (!actualTable) {

        continue;
      }
      try {
        await sequelize.query(`ALTER TABLE \`${actualTable}\` MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT`);

      } catch(e) {

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

      } catch(e) {

      }
    }

    // Restore clean foreign keys

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

      } catch(e) {

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




    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

runPatch();
