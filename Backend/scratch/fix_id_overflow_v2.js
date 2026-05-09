const { sequelize } = require('../model/index');

async function fixIds() {
  try {
    console.log("Fixing ID ranges with Foreign Key handling...");

    // 1. Drop redundant foreign keys on PurchaseGRNDetails
    console.log("- Dropping constraints on PurchaseGRNDetails...");
    for (let i = 1; i <= 8; i++) {
        try {
            await sequelize.query(`ALTER TABLE PurchaseGRNDetails DROP FOREIGN KEY purchasegrndetails_ibfk_${i}`);
            console.log(`  Dropped ibfk_${i}`);
        } catch(e) { /* ignore if doesn't exist */ }
    }

    // 2. Change columns to BIGINT
    console.log("- Changing columns to BIGINT...");
    
    // PurchaseGRNs
    await sequelize.query("ALTER TABLE PurchaseGRNs MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    
    // PurchaseGRNDetails
    await sequelize.query("ALTER TABLE PurchaseGRNDetails MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    await sequelize.query("ALTER TABLE PurchaseGRNDetails MODIFY COLUMN purchaseGRNId BIGINT NOT NULL");

    // 3. Recreate foreign key (only one clean one)
    console.log("- Recreating foreign key...");
    await sequelize.query(`
        ALTER TABLE PurchaseGRNDetails 
        ADD CONSTRAINT fk_purchase_grn 
        FOREIGN KEY (purchaseGRNId) REFERENCES PurchaseGRNs(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // 4. Reset AUTO_INCREMENT
    console.log("- Resetting auto-increments...");
    await sequelize.query("ALTER TABLE PurchaseGRNs AUTO_INCREMENT = 1");
    await sequelize.query("ALTER TABLE PurchaseGRNDetails AUTO_INCREMENT = 1");

    console.log("✅ ID range fix completed successfully!");
    process.exit(0);
  } catch (e) {
    console.error("❌ Migration failed:", e.message);
    process.exit(1);
  }
}

fixIds();
