const { sequelize } = require('../model/index');

async function fixPoIds() {
  try {
    console.log("Fixing Purchase Order ID ranges...");

    // 1. Drop constraints
    console.log("- Dropping constraints on PurchaseOrderDetails...");
    try {
        await sequelize.query(`ALTER TABLE purchaseorderdetails DROP FOREIGN KEY purchaseorderdetails_ibfk_1`);
    } catch(e) {}
    try {
        await sequelize.query(`ALTER TABLE purchaseorderdetails DROP FOREIGN KEY purchaseorderdetails_ibfk_2`);
    } catch(e) {}

    // 2. Modify columns
    await sequelize.query("ALTER TABLE purchaseorders MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    await sequelize.query("ALTER TABLE purchaseorderdetails MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT");
    await sequelize.query("ALTER TABLE purchaseorderdetails MODIFY COLUMN purchaseOrderId BIGINT NOT NULL");

    // 3. Restore constraint
    console.log("- Restoring constraint...");
    await sequelize.query(`
        ALTER TABLE purchaseorderdetails 
        ADD CONSTRAINT fk_po_details 
        FOREIGN KEY (purchaseOrderId) REFERENCES purchaseorders(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    console.log("✅ PO ID fix complete.");
    process.exit(0);
  } catch (e) {
    console.error("❌ PO Migration failed:", e.message);
    process.exit(1);
  }
}

fixPoIds();
