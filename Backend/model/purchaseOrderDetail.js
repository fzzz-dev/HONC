const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PurchaseOrderDetail = sequelize.define("PurchaseOrderDetail", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  purchaseOrderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PurchaseOrders',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  indentDetailId: { type: DataTypes.INTEGER, allowNull: true },
  indentNo: { type: DataTypes.STRING, defaultValue: "" },
  itemId: { type: DataTypes.INTEGER, allowNull: true },
  itemName: { type: DataTypes.STRING, defaultValue: "" },
  uom: { type: DataTypes.STRING, defaultValue: "" },
  balQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  poQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  poRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  discMode: { type: DataTypes.STRING, defaultValue: "pct" },
  discPct: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
  discPrice: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  poAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  gstPct: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totGst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 }
}, {
  timestamps: true,
});

module.exports = PurchaseOrderDetail;
