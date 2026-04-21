const mongoose = require("mongoose");

const grnDetailSchema = new mongoose.Schema(
  {
    // Indent linkage
    indentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseIndent",
      default: null,
    },
    indentNo: { type: String, default: "" },

    // PO linkage
    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },
    poNo: { type: String, default: "" },
    poDate: { type: String, default: "" },
    poDetailId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    }, // _id of the PO detail row

    // Item info (denormalized)
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },
    itemName: { type: String, default: "" },
    uom: { type: String, default: "" },

    // Quantity tracking
    poQty: { type: Number, default: 0, min: 0 }, // Original PO quantity
    alGrnQty: { type: Number, default: 0, min: 0 }, // Already received (from previous GRNs)
    balQty: { type: Number, default: 0, min: 0 }, // poQty - alGrnQty
    grnQty: { type: Number, default: 0, min: 0 }, // THIS GRN's quantity

    // Pricing
    poRate: { type: Number, default: 0 },
    grnRate: { type: Number, default: 0 }, // Actual received rate (may differ from PO)

    // Discount
    discPct: { type: Number, default: 0, min: 0, max: 100 },

    // Computed amounts
    grnAmount: { type: Number, default: 0 }, // grnQty * grnRate * (1 - discPct/100)
    gstPct: { type: Number, default: 18, min: 0 },
    sgst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totGst: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 }, // grnAmount + totGst

    // Batch & Expiry tracking
    batchNo: { type: String, default: "" },
    expiryDate: { type: String, default: "" }, // ISO date string (YYYY-MM-DD)
    mfgDate: { type: String, default: "" }, // Manufacturing date

    // Remarks
    remarks: { type: String, default: "" },
  },
  { _id: true },
);

const purchaseGRNSchema = new mongoose.Schema(
  {
    grnNo: { type: String, required: true, unique: true, trim: true },
    date: { type: String, required: true }, // GRN date

    // Supplier info
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: { type: String, default: "" },

    // Store/Warehouse info
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
    },
    storeName: { type: String, default: "" },

    // Invoice details from supplier
    invoiceNo: { type: String, default: "" },
    invoiceDate: { type: String, default: "" },

    // Transport details
    vehicleNo: { type: String, default: "" },
    lrNo: { type: String, default: "" }, // Lorry Receipt Number
    transporterName: { type: String, default: "" },

    // GST configuration
    gstEnabled: { type: Boolean, default: true },
    gstType: { type: String, enum: ["local", "other"], default: "local" },

    // Status tracking
    status: {
      type: String,
      enum: ["Draft", "Completed", "Cancelled"],
      default: "Completed",
    },

    // Audit fields
    createdBy: { type: String, default: "Admin" },
    createdOn: { type: String, default: "" },
    verifiedBy: { type: String, default: "" },
    verifiedOn: { type: String, default: "" },

    remarks: { type: String, default: "" },

    // Detail rows
    details: { type: [grnDetailSchema], default: [] },
  },
  { timestamps: true },
);

// Pre-save hook to auto-set createdOn
purchaseGRNSchema.pre("save", function (next) {
  if (this.isNew && !this.createdOn) {
    this.createdOn = new Date().toISOString();
  }
  next();
});

// Post-save hook: Update stock levels and PO GRN quantities
purchaseGRNSchema.post("save", async function (doc) {
  try {
    const { updateStockFromGRN } = require("../utils/updateStockFromGRN");
    const {
      recalculatePOGRNQuantities,
    } = require("../utils/recalculatePOGRNQuantities");

    // Only update stock if GRN is Completed
    if (doc.status === "Completed") {
      await updateStockFromGRN(doc);
    }

    // Recalculate PO balance quantities
    await recalculatePOGRNQuantities();
  } catch (e) {
    console.error("Post-save GRN hook error:", e.message);
  }
});

// Post-update hook
purchaseGRNSchema.post("findOneAndUpdate", async function () {
  try {
    const {
      recalculatePOGRNQuantities,
    } = require("../utils/recalculatePOGRNQuantities");
    await recalculatePOGRNQuantities();
  } catch (e) {
    console.error("Post-update GRN hook error:", e.message);
  }
});

// Post-delete hook
purchaseGRNSchema.post("findOneAndDelete", async function (doc) {
  try {
    const { revertStockFromGRN } = require("../utils/updateStockFromGRN");
    const {
      recalculatePOGRNQuantities,
    } = require("../utils/recalculatePOGRNQuantities");

    // Revert stock if GRN was Completed
    if (doc && doc.status === "Completed") {
      await revertStockFromGRN(doc);
    }

    await recalculatePOGRNQuantities();
  } catch (e) {
    console.error("Post-delete GRN hook error:", e.message);
  }
});

// Indexes for performance
purchaseGRNSchema.index({ grnNo: 1 });
purchaseGRNSchema.index({ date: 1 });
purchaseGRNSchema.index({ status: 1 });
purchaseGRNSchema.index({ supplierId: 1 });
purchaseGRNSchema.index({ storeId: 1 });
purchaseGRNSchema.index({ "details.poId": 1 });
purchaseGRNSchema.index({ "details.itemId": 1 });
purchaseGRNSchema.index({ "details.expiryDate": 1 });

const PurchaseGRN =
  mongoose.models.PurchaseGRN ||
  mongoose.model("PurchaseGRN", purchaseGRNSchema);

module.exports = PurchaseGRN;
