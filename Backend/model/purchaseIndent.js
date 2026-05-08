const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PurchaseIndent = sequelize.define("PurchaseIndent", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  indentNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  departmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Departments',
      key: 'id',
    },
  },
  departmentName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: "Admin",
  },
  createdOn: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  status: {
    type: DataTypes.ENUM("Open", "Closed", "Cancelled"),
    defaultValue: "Open",
  },
  remarks: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  totalQty: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  totalItems: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  timestamps: true,
});

module.exports = PurchaseIndent;
