const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const State = sequelize.define("State", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "State name is required" },
    },
  },
  countryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Countries',
      key: 'id',
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
    { fields: ["countryId", "name"] },
    { fields: ["active"] },
  ],
});

module.exports = State;
