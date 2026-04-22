const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const InventoryHead = sequelize.define("InventoryHead", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  headName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Head name is required" },
    },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["headName"] },
    { fields: ["active"] },
  ],
});

module.exports = InventoryHead;