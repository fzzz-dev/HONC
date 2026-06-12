const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const HrSubDepartment = sequelize.define('HrSubDepartment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  departmentId: { type: DataTypes.INTEGER, allowNull: false, field: 'department_id' },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW }
}, { tableName: 'hr_sub_department', timestamps: true, underscored: true });

module.exports = HrSubDepartment;