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
  details: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
}, {
  timestamps: true,
  hooks: {
    beforeSave: (indent) => {
      if (indent.details && Array.isArray(indent.details)) {
        indent.details.forEach(d => {
          if (!d.alPoQty || d.alPoQty === 0) {
            d.balQty = d.indentQty || 0;
          }
        });
      }
    },
  },
});

module.exports = PurchaseIndent;
