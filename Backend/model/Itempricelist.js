const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ItemPriceList = sequelize.define("ItemPriceList", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  listNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "ipl_no_unique",
    validate: {
      is: /^IPL-\d{4}-\d{3}$/,
    },
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Suppliers',
      key: 'id',
    },
  },
  supplierName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  details: {
    type: DataTypes.JSON, // Sub-schema as JSON
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("draft", "active", "archived"),
    defaultValue: "active",
  },
  validFrom: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  validTo: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
});

module.exports = ItemPriceList;
