const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OpeningStock = sequelize.define("OpeningStock", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  openingNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "opening_no_unique",
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  asOnDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  storeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Stores',
      key: 'id',
    },
  },
  storeName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  details: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  remarks: {
    type: DataTypes.TEXT,
  },
  preparedBy: {
    type: DataTypes.STRING,
  },
}, {
  timestamps: true,
});

module.exports = OpeningStock;
