const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Spec = sequelize.define("Spec", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: "spec_name_unique",
    validate: {
      notEmpty: true,
    },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = Spec;
