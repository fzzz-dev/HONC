const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PurchaseIndentDetail = sequelize.define("PurchaseIndentDetail", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  purchaseIndentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PurchaseIndents',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  inventoryHeadId: { type: DataTypes.INTEGER, allowNull: true },
  inventoryHeadName: { type: DataTypes.STRING, defaultValue: "" },
  mainCategoryId: { type: DataTypes.INTEGER, allowNull: true },
  mainCategoryName: { type: DataTypes.STRING, defaultValue: "" },
  itemId: { type: DataTypes.INTEGER, allowNull: true },
  itemName: { type: DataTypes.STRING, defaultValue: "" },
  uom: { type: DataTypes.STRING, defaultValue: "" },
  indentQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  dueDate: { type: DataTypes.STRING, defaultValue: "" },
  remarks: { type: DataTypes.STRING, defaultValue: "" },
  alPoQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  balQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
}, {
  timestamps: true,
});

module.exports = PurchaseIndentDetail;
