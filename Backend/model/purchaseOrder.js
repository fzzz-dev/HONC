const mongoose = require("mongoose");

const poDetailSchema = new mongoose.Schema({
  indentNo: String,
  itemName: String,
  uom: String,
  indentQty: {
    type: Number,
    default: 0,
  },
  alPoQty: {
    type: Number,
    default: 0,
  },
  balQty: {
    type: Number,
    default: 0,
  },
  poQty: {
    type: Number,
    default: 0,
  },
  priceListRate: {
    type: Number,
    default: 0,
  },
  poRate: {
    type: Number,
    default: 0,
  },
  discMode: {
    type: String,
    enum: ["pct", "price"],
    default: "pct",
  },
  discPct: {
    type: Number,
    default: 0,
  },
  discPrice: {
    type: Number,
    default: 0,
  },
  poAmount: {
    type: Number,
    default: 0,
  },
  gstPct: {
    type: Number,
    default: 18,
  },
  sgst: {
    type: Number,
    default: 0,
  },
  cgst: {
    type: Number,
    default: 0,
  },
  igst: {
    type: Number,
    default: 0,
  },
  totGst: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  indentRemarks: String,
  poRemarks: String,
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNo: {
      type: String,
      required: [true, "PO number is required"],
      unique: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },
    supplierName: {
      type: String,
      required: true,
    },
    createdBy: {
      type: String,
      default: "Admin",
    },
    createdOn: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "Closed", "Cancelled"],
      default: "Open",
    },
    remarks: {
      type: String,
      default: "",
    },
    gstEnabled: {
      type: Boolean,
      default: true,
    },
    details: [poDetailSchema],
  },
  {
    timestamps: true,
  },
);

purchaseOrderSchema.index({ poNo: 1 });
purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ date: 1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
