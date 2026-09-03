const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const Quotation = sequelize.define(
  "Quotation",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    docId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    date: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    customerName: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    enqRefNo: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    refDate: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    styleRefNo: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    enqNo: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    preparedBy: {
      type: DataTypes.STRING,
      defaultValue: "Admin",
    },

    remarks: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },

    totalQty: {
      type: DataTypes.DECIMAL(12, 3),
      defaultValue: 0,
    },

    totalItems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Quotation;