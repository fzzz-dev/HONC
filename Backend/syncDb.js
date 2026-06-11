const { sequelize } = require('./model/index.js');

async function run() {
  try {
    console.log("🔄 Running database sync...");
    await sequelize.sync({ alter: true });
    console.log("✅ Database sync completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Database sync failed:", err.message);
    process.exit(1);
  }
}

run();