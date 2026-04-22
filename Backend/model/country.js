const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Country = sequelize.define("Country", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "Country name is required" },
    },
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true,
    set(val) {
      if (val) this.setDataValue("code", val.toUpperCase());
    },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["name"] },
    { fields: ["active"] },
  ],
});

module.exports = Country;