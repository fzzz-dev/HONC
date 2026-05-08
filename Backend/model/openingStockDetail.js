const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OpeningStockDetail = sequelize.define("OpeningStockDetail", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  openingStockId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  category: { type: DataTypes.STRING },
  subCategory: { type: DataTypes.STRING },
  itemId: { type: DataTypes.STRING },
  itemName: { type: DataTypes.STRING },
  qty: { type: DataTypes.DECIMAL(10, 2) },
  rate: { type: DataTypes.DECIMAL(10, 2) },
  amount: { type: DataTypes.DECIMAL(10, 2) },
  openingRemarks: { type: DataTypes.TEXT },
}, {
  timestamps: true,
});

module.exports = OpeningStockDetail;
