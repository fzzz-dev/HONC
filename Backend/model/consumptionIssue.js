const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ConsumptionIssue = sequelize.define("ConsumptionIssue", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  issNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "iss_no_unique",
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Departments',
      key: 'id',
    },
  },
  departmentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  storeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Stores',
      key: 'id',
    },
  },
  storeName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  requestedBy: {           
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "",
  },
  remarks: {               
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "",
  },
  totalQty: { type: DataTypes.DECIMAL(10, 3), defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totalItems: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  timestamps: true,
});

module.exports = ConsumptionIssue;