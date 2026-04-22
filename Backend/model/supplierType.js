const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SupplierType = sequelize.define("SupplierType", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "type_name_unique",
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    defaultValue: "#5F5E5A",
  },
  bgColor: {
    type: DataTypes.STRING,
    defaultValue: "#F1EFE8",
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
}, {
  timestamps: true,
});

module.exports = SupplierType;
