// src/models/production/Color.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const Color = sequelize.define('Color', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  hexCode: { type: DataTypes.STRING(7), allowNull: true, field: 'hex_code' },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW }
}, { 
  tableName: 'production_colors', 
  timestamps: true, 
  underscored: true 
});

module.exports = Color;