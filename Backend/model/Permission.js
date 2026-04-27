const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Permission = sequelize.define("Permission", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  roleName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  resourcePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  canAccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

module.exports = Permission;
