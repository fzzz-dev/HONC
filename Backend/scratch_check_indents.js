const PurchaseIndent = require("./model/purchaseIndent");
const sequelize = require("./config/database");

async function check() {
  try {
    const count = await PurchaseIndent.count({ where: { status: 'Open' } });
    console.log("Open Indents Count:", count);
    const all = await PurchaseIndent.findAll({ where: { status: 'Open' }, limit: 5 });
    all.forEach(i => {
      console.log(`Indent: ${i.indentNo}, Details Type: ${typeof i.details}, Details: ${JSON.stringify(i.details).substring(0, 50)}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
