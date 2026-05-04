const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PurchaseOrder = sequelize.define("PurchaseOrder", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  poNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Suppliers',
      key: 'id',
    },
  },
  supplierName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  paymentTermsId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "PaymentTerms",
      key: "id",
    },
  },
  paymentTermsName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  gstEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  gstType: {
    type: DataTypes.ENUM("local", "other"),
    defaultValue: "local",
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: "Admin",
  },
  createdOn: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  status: {
    type: DataTypes.ENUM("Open", "Closed", "Cancelled"),
    defaultValue: "Open",
  },
  remarks: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  details: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
}, {
  timestamps: true,
  hooks: {
    afterSave: async (po) => {
      try {
        const { recalculateIndents } = require("../utils/recalculateIndents");
        await recalculateIndents();
      } catch (e) {
        console.error("recalculateIndents (afterSave PO):", e.message);
      }
    },
    afterUpdate: async (po) => {
      try {
        const { recalculateIndents } = require("../utils/recalculateIndents");
        await recalculateIndents();
      } catch (e) {
        console.error("recalculateIndents (afterUpdate PO):", e.message);
      }
    },
    afterDestroy: async (po) => {
      try {
        const { recalculateIndents } = require("../utils/recalculateIndents");
        await recalculateIndents();
      } catch (e) {
        console.error("recalculateIndents (afterDestroy PO):", e.message);
      }
    },
  },
});

module.exports = PurchaseOrder;
