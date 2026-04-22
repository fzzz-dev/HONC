const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MainCategory = sequelize.define("MainCategory", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  headId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'InventoryHeads',
      key: 'id',
    },
  },
  headName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  groupName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [{ fields: ["headId", "groupName"] }, { fields: ["active"] }],
});

module.exports = MainCategory;
