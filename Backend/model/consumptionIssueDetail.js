const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ConsumptionIssueDetail = sequelize.define("ConsumptionIssueDetail", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  consumptionIssueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ConsumptionIssues',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  itemId: { type: DataTypes.INTEGER, allowNull: true },
  itemName: { type: DataTypes.STRING, defaultValue: "" },
  stkQty: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  issueQty: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  uom: { type: DataTypes.STRING, defaultValue: "" },
  balQty: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  issueRemarks: { type: DataTypes.STRING, defaultValue: "" }
}, {
  timestamps: true,
});

module.exports = ConsumptionIssueDetail;