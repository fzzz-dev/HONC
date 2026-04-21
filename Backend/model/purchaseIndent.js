// models/PurchaseIndent.js
const mongoose = require("mongoose");

const detailSchema = new mongoose.Schema(
  {
    inventoryHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryHead",
    },
    inventoryHeadName: { type: String, default: "" },
    mainCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MainCategory",
    },
    mainCategoryName: { type: String, default: "" },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
    itemName: { type: String, default: "" },
    uom: { type: String, default: "" },
    indentQty: { type: Number, default: 0, min: 0 },
    dueDate: { type: String, default: "" },
    remarks: { type: String, default: "" },

    // PO fulfilment tracking — computed by recalculateIndents(), never set manually
    alPoQty: { type: Number, default: 0 }, // sum of poQty across all non-Cancelled POs
    // ✅ FIX: default balQty to indentQty so new indents show correct balance immediately
    balQty: { type: Number, default: 0 }, // indentQty - alPoQty
  },
  { _id: true },
);

const purchaseIndentSchema = new mongoose.Schema(
  {
    indentNo: { type: String, required: true, unique: true, trim: true },
    date: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    departmentName: { type: String, default: "" },
    createdBy: { type: String, default: "Admin" },
    createdOn: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Open", "Closed", "Cancelled"],
      default: "Open",
    },
    remarks: { type: String, default: "" },
    details: { type: [detailSchema], default: [] },
  },
  { timestamps: true },
);

// ✅ FIX: on save, initialise balQty = indentQty for any detail row
//         where balQty hasn't been set by recalculateIndents yet (alPoQty === 0)
purchaseIndentSchema.pre("save", async function () {
  for (const d of this.details) {
    if (d.alPoQty === 0) {
      d.balQty = d.indentQty;
    }
  }
});

purchaseIndentSchema.index({ indentNo: 1 });
purchaseIndentSchema.index({ status: 1 });
purchaseIndentSchema.index({ departmentId: 1 });

const PurchaseIndent =
  mongoose.models.PurchaseIndent ||
  mongoose.model("PurchaseIndent", purchaseIndentSchema);

module.exports = PurchaseIndent;
