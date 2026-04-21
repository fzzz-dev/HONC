// models/PurchaseOrder.js
const mongoose = require("mongoose");

const poDetailSchema = new mongoose.Schema(
  {
    // Indent linkage — optional (PO can be created without an indent)
    indentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseIndent",
      default: null,
    },
    indentNo: { type: String, default: "" },
    indentDetailId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    }, // _id of the indent detail row

    // Item info (denormalised for speed)
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },
    itemName: { type: String, default: "" },
    uom: { type: String, default: "" },

    // Qty
    indentQty: { type: Number, default: 0, min: 0 },
    alPoQty: { type: Number, default: 0, min: 0 }, // already-PO'd qty (from other POs)
    balQty: { type: Number, default: 0, min: 0 }, // indentQty - alPoQty
    poQty: { type: Number, default: 0, min: 0 }, // THIS PO's qty

    // Pricing
    priceListRate: { type: Number, default: 0 },
    poRate: { type: Number, default: 0 },

    // Discount — stored in both forms
    discMode: { type: String, enum: ["pct", "price"], default: "pct" },
    discPct: { type: Number, default: 0 },
    discPrice: { type: Number, default: 0 },

    // Computed amounts
    poAmount: { type: Number, default: 0 }, // after discount, before GST
    gstPct: { type: Number, default: 18 },
    sgst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    totGst: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    // Remarks
    indentRemarks: { type: String, default: "" },
    poRemarks: { type: String, default: "" },
  },
  { _id: true },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNo: { type: String, required: true, unique: true, trim: true },
    date: { type: String, required: true },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },
    supplierName: { type: String, default: "" },

    // GST config
    gstEnabled: { type: Boolean, default: true },
    // "local" → SGST + CGST; "other" → IGST only
    gstType: { type: String, enum: ["local", "other"], default: "local" },

    createdBy: { type: String, default: "Admin" },
    createdOn: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Open", "Closed", "Cancelled"],
      default: "Open",
    },
    remarks: { type: String, default: "" },

    details: { type: [poDetailSchema], default: [] },
  },
  { timestamps: true },
);

// After a PO is saved/updated we must recalculate the indent balance quantities.
// We do this via a post-save hook that calls the shared helper.
purchaseOrderSchema.post("save", async function () {
  try {
    const { recalculateIndents } = require("../utils/recalculateIndents");
    await recalculateIndents();
  } catch (e) {
    console.error("recalculateIndents (post-save PO):", e.message);
  }
});

// Also recalc after findOneAndUpdate / findOneAndDelete
purchaseOrderSchema.post("findOneAndUpdate", async function () {
  try {
    const { recalculateIndents } = require("../utils/recalculateIndents");
    await recalculateIndents();
  } catch (e) {
    console.error("recalculateIndents (post-update PO):", e.message);
  }
});

purchaseOrderSchema.post("findOneAndDelete", async function () {
  try {
    const { recalculateIndents } = require("../utils/recalculateIndents");
    await recalculateIndents();
  } catch (e) {
    console.error("recalculateIndents (post-delete PO):", e.message);
  }
});

purchaseOrderSchema.index({ poNo: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ supplierId: 1 });

const PurchaseOrder =
  mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", purchaseOrderSchema);

module.exports = PurchaseOrder;
