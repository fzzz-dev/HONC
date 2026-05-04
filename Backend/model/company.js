const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Company = sequelize.define("Company", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "My Company",
  },
  address: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  phone: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  email: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  gstin: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  logo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
}, {
  timestamps: true,
});

module.exports = Company;
