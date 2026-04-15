const mongoose = require("mongoose");

const indentDetailSchema = new mongoose.Schema({
  inventoryHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryHead",
  },
  inventoryHeadName: String,
  mainCategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MainCategory",
  },
  mainCategoryName: String,
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
  },
  itemName: String,
  uom: String,
  indentQty: {
    type: Number,
    default: 0,
  },
  dueDate: String,
  remarks: String,
});

const purchaseIndentSchema = new mongoose.Schema(
  {
    indentNo: {
      type: String,
      required: [true, "Indent number is required"],
      unique: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    departmentName: {
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
    details: [indentDetailSchema],
  },
  {
    timestamps: true,
  },
);

purchaseIndentSchema.index({ indentNo: 1 });
purchaseIndentSchema.index({ departmentId: 1 });
purchaseIndentSchema.index({ status: 1 });
purchaseIndentSchema.index({ date: 1 });

module.exports = mongoose.model("PurchaseIndent", purchaseIndentSchema);
