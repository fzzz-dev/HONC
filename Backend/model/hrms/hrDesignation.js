const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const HrDesignation = sequelize.define('HrDesignation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  subDepartmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'sub_department_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  level: { type: DataTypes.INTEGER, allowNull: true },
  responsibilities: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW }
}, { tableName: 'hr_designation', timestamps: true, underscored: true });

module.exports = HrDesignation;