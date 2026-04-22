const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Supplier = sequelize.define("Supplier", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  supplierName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  state: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  addresses: {
    type: DataTypes.JSON, // Store as JSON array to match current logic
    defaultValue: [],
  },
  gstNo: {
    type: DataTypes.STRING,
    allowNull: true,
    set(val) {
      if (val) this.setDataValue("gstNo", val.toUpperCase());
    },
  },
  panNo: {
    type: DataTypes.STRING,
    allowNull: true,
    set(val) {
      if (val) this.setDataValue("panNo", val.toUpperCase());
    },
  },
  emailId1: {
    type: DataTypes.STRING,
    allowNull: true,
    set(val) {
      this.setDataValue("emailId1", val === "" ? null : val);
    },
    validate: {
      isEmail: true,
    },
  },
  emailId2: {
    type: DataTypes.STRING,
    allowNull: true,
    set(val) {
      this.setDataValue("emailId2", val === "" ? null : val);
    },
    validate: {
      isEmail: true,
    },
  },
  mobileNo1: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  mobileNo2: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  timestamps: true,
  hooks: {
    beforeSave: (supplier) => {
      if (supplier.addresses && supplier.addresses.length > 0) {
        const hasPrimary = supplier.addresses.some((a) => a.isPrimary);
        if (!hasPrimary) supplier.addresses[0].isPrimary = true;
        
        const primary = supplier.addresses.find((a) => a.isPrimary) || supplier.addresses[0];
        supplier.state = primary.stateName || "";
      }
    },
  },
});

module.exports = Supplier;
