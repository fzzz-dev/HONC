// In model/hrms/HrDesignation.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const HrDesignation = sequelize.define('HrDesignation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  department_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'department_id'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  responsibilities: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  created_at: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'hr_designation',
  timestamps: true,
  underscored: true
});

module.exports = HrDesignation;