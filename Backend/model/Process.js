const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Process = sequelize.define("Process", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
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
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [{ fields: ["name"] }, { fields: ["departmentId"] }, { fields: ["active"] }],
});

module.exports = Process;