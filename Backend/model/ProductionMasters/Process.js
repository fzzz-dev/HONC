// models/production/Process.js
const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const ProductionProcess = sequelize.define('ProductionProcess', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  sequence: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW }
}, { 
  tableName: 'production_processes',  // ← Make sure this matches your actual table name
  timestamps: true, 
  underscored: true 
});

module.exports = ProductionProcess;