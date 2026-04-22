const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Make = sequelize.define("Make", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: "make_name_unique",
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.STRING(500),
    defaultValue: "",
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = Make;
