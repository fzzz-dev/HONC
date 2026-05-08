const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PurchaseGRN = sequelize.define("PurchaseGRN", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  grnNo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  grnType: {
    type: DataTypes.STRING,
    defaultValue: "Against PO",
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
    defaultValue: "",
  },
  storeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Stores',
      key: 'id',
    },
  },
  storeName: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  invoiceNo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  invoiceDate: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  vehicleNo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  lrNo: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  transporterName: {
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
  status: {
    type: DataTypes.ENUM("Draft", "Completed", "Cancelled"),
    defaultValue: "Completed",
  },
  createdBy: {
    type: DataTypes.STRING,
    defaultValue: "Admin",
  },
  createdOn: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  verifiedBy: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  verifiedOn: {
    type: DataTypes.STRING,
    defaultValue: "",
  },
  remarks: {
    type: DataTypes.TEXT,
    defaultValue: "",
  },
  totalQty: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  totalItems: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: (grn) => {
      if (!grn.createdOn) {
        grn.createdOn = new Date().toISOString();
      }
    },
    afterSave: async (grn) => {
      try {
        const { updateStockFromGRN } = require("../utils/updateStockFromGRN");
        const { recalculatePOGRNQuantities } = require("../utils/recalculatePOGRNQuantities");
        if (grn.status === "Completed") {
          await updateStockFromGRN(grn);
        }
        await recalculatePOGRNQuantities();
      } catch (e) {
        console.error("afterSave GRN hook error:", e.message);
      }
    },
    afterUpdate: async (grn) => {
      try {
        const { recalculatePOGRNQuantities } = require("../utils/recalculatePOGRNQuantities");
        await recalculatePOGRNQuantities();
      } catch (e) {
        console.error("afterUpdate GRN hook error:", e.message);
      }
    },
    afterDestroy: async (grn) => {
      try {
        const { revertStockFromGRN } = require("../utils/updateStockFromGRN");
        const { recalculatePOGRNQuantities } = require("../utils/recalculatePOGRNQuantities");
        if (grn && grn.status === "Completed") {
          await revertStockFromGRN(grn);
        }
        await recalculatePOGRNQuantities();
      } catch (e) {
        console.error("afterDestroy GRN hook error:", e.message);
      }
    },
  },
});

module.exports = PurchaseGRN;
