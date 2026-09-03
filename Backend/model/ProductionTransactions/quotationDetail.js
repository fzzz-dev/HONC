const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const QuotationDetail = sequelize.define(
  "QuotationDetail",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    colour: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    counts: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    yarnType: {
      type: DataTypes.STRING,
      defaultValue: "",
    },

    enqQty: {
      type: DataTypes.DECIMAL(12, 3),
      defaultValue: 0,
    },

    qtyRate: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    rate2: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    rate3: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    confirmationRate: {
      type: DataTypes.STRING,
      defaultValue: "N",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = QuotationDetail;