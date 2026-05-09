const { sequelize } = require('../model/index');

async function aggressiveFix() {
  const dbName = sequelize.config.database;
  try {
    console.log(`Aggressively fixing IDs for all procurement tables in ${dbName}...`);

    const tables = ['purchaseorderdetails', 'purchasegrndetails', 'purchaseindentdetails', 'openingstockdetails', 'consumptionissuedetails'];
    
    for (const table of tables) {
        // Find constraints
        const [constraints] = await sequelize.query(`
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = '${dbName}' 
            AND TABLE_NAME = '${table}' 
            AND CONSTRAINT_NAME <> 'PRIMARY'
        `);
        
        for (const c of constraints) {
            try {
                await sequelize.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${c.CONSTRAINT_NAME}`);
                console.log(`  Dropped ${c.CONSTRAINT_NAME} from ${table}`);
            } catch(e) {}
        }
    }

    // Now fix the parents
    const parents = ['purchaseorders', 'purchasegrns', 'purchaseindents', 'openingstocks', 'consumptionissues'];
    for (const p of parents) {
        try {
            await sequelize.query(`ALTER TABLE ${p} MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT`);
            console.log(`  Upgraded ${p}.id to BIGINT`);
        } catch(e) { console.error(`Failed ${p}: ${e.message}`); }
    }

    // Fix the children ids and FK columns
    for (const table of tables) {
        try {
            await sequelize.query(`ALTER TABLE ${table} MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT`);
            // Find the foreign key column (e.g. purchaseOrderId)
            const parentBase = table.replace('details', '');
            const fkCol = parentBase.endsWith('y') ? parentBase.slice(0,-1) + 'iesId' : parentBase + 'Id';
            // Wait, naming is inconsistent. Let's just hardcode the ones we know.
            let col = '';
            if (table === 'purchaseorderdetails') col = 'purchaseOrderId';
            if (table === 'purchasegrndetails') col = 'purchaseGRNId';
            if (table === 'purchaseindentdetails') col = 'purchaseIndentId';
            if (table === 'openingstockdetails') col = 'openingStockId';
            if (table === 'consumptionissuedetails') col = 'consumptionIssueId';
            
            if (col) {
                await sequelize.query(`ALTER TABLE ${table} MODIFY COLUMN ${col} BIGINT NOT NULL`);
            }
            console.log(`  Upgraded ${table} columns`);
        } catch(e) { console.error(`Failed ${table}: ${e.message}`); }
    }

    console.log("✅ Aggressive ID fix complete.");
    process.exit(0);
  } catch (e) {
    console.error("❌ Aggressive Migration failed:", e.message);
    process.exit(1);
  }
}

aggressiveFix();
