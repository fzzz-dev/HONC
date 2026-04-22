const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const City = sequelize.define("City", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  stateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'States',
      key: 'id',
    },
    validate: {
      notNull: { msg: "State is required" },
    },
  },
  stateName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: "City name is required" },
    },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ["stateId", "name"] },
    { fields: ["active"] },
  ],
});

module.exports = City;
