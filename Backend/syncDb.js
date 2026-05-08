const { sequelize } = require('./model/index.js');
async function run() {
  try {
    console.log("Syncing database with alter: true...");
    await sequelize.sync({ alter: true });
    console.log("Database synced successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Sync error:", err);
    process.exit(1);
  }
}
run();
