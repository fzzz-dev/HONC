const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PurchaseGRNDetail = sequelize.define("PurchaseGRNDetail", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  purchaseGRNId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PurchaseGRNs',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  poId: { type: DataTypes.INTEGER, allowNull: true },
  poNo: { type: DataTypes.STRING, defaultValue: "" },
  poDate: { type: DataTypes.STRING, defaultValue: "" },
  indentNo: { type: DataTypes.STRING, defaultValue: "" },
  itemId: { type: DataTypes.INTEGER, allowNull: true },
  itemName: { type: DataTypes.STRING, defaultValue: "" },
  uom: { type: DataTypes.STRING, defaultValue: "" },
  poQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  alGrnQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  balQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  grnQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  phyQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  poRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  grnRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  discPct: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  grnAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  gstPct: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  sgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cgst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  igst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totGst: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  remarks: { type: DataTypes.STRING, defaultValue: "" },
  isBatch: { type: DataTypes.STRING, defaultValue: "No" },
  batchNo: { type: DataTypes.STRING, defaultValue: "" },
  mfgDate: { type: DataTypes.STRING, defaultValue: "" },
  expDate: { type: DataTypes.STRING, defaultValue: "" },
  batchQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
}, {
  timestamps: true,
});

module.exports = PurchaseGRNDetail;
