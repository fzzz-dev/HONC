// src/models/production/Counts.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Counts = sequelize.define('Counts', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  value: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW }
}, { 
  tableName: 'production_counts', 
  timestamps: true, 
  underscored: true 
});

module.exports = Counts;