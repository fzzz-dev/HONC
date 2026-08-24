// src/models/production/Mill.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Mill = sequelize.define('Mill', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  location: { type: DataTypes.STRING(200), allowNull: true },
  contact: { type: DataTypes.STRING(100), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW }
}, { 
  tableName: 'production_mills', 
  timestamps: true, 
  underscored: true 
});

module.exports = Mill;