const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const HrShift = sequelize.define('HrShift', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  startTime: { type: DataTypes.TIME, allowNull: false, field: 'start_time' },
  endTime: { type: DataTypes.TIME, allowNull: false, field: 'end_time' },
  graceMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: 'grace_minutes' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW }
}, { tableName: 'hr_shift', timestamps: true, underscored: true });

module.exports = HrShift;