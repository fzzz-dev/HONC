const { sequelize } = require('./model/index.js');

async function run() {
  try {

    await sequelize.sync({ alter: true });

    process.exit(0);
  } catch (err) {

    process.exit(1);
  }
}

run();