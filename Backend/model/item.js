const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Item = sequelize.define("Item", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  headId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'InventoryHeads',
      key: 'id',
    },
  },
  head: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  group: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  subCategory: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  itemName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  uom: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  make: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  spec: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  movementType: {
    type: DataTypes.ENUM("moving", "non-moving"),
    allowNull: false,
    defaultValue: "moving",
  },
  itemDescription: {
    type: DataTypes.STRING(1024),
    allowNull: true,
  },
  minimumStock: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  minimumOrderQty: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  leadDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  inTransitDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  hsnCode: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  gstPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
  },
  rackBinNo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  rate: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = Item;
