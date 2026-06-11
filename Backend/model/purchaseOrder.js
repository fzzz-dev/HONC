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
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,  // ← KEY FIX
  },
  deliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,  // ← KEY FIX
  },
  purchaseIndentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  purchaseIndentNo: {
    type: DataTypes.STRING,
    defaultValue: "",
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
  type: DataTypes.ENUM("Open", "Partial", "Closed", "Cancelled"),
  defaultValue: "Open",
},
  remarks: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  grossAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  poAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  igstAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  cgstAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  sgstAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  netAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totalItems: { type: DataTypes.INTEGER, defaultValue: 0 },
  roundoff: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  poType: { type: DataTypes.STRING, defaultValue: "" },
  transportCharges: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  // Add these approval fields
    level1Approved: {
      type: DataTypes.STRING,
      defaultValue: 'No',
      allowNull: false,
      validate: {
        isIn: [['Yes', 'No']]
      }
    },
    level2Approved: {
      type: DataTypes.STRING,
      defaultValue: 'No',
      allowNull: false,
      validate: {
        isIn: [['Yes', 'No']]
      }
    },
    level1ApprovedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    level1ApprovedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    },
    level2ApprovedBy: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    },
    level2ApprovedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    }
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
