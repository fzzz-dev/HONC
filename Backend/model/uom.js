const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Uom = sequelize.define("Uom", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "uom_name_unique",
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [{ fields: ["active"] }],
});

module.exports = Uom;
