const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryHead",
      required: [true, "Inventory head is required"],
    },
    head: {
      type: String,
      required: true,
    },
    group: {
      type: String,
      default: "",
    },
    subCategory: {
      type: String,
      default: "",
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    uom: {
      type: String,
      default: "",
    },
    make: {
      type: String,
      default: "",
    },
    spec: {
      type: String,
      default: "",
    },
    itemDescription: {
      type: String,
      default: "",
    },
    rate: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

itemSchema.index({ headId: 1, itemName: 1 });
itemSchema.index({ group: 1 });
itemSchema.index({ active: 1 });

module.exports = mongoose.model("Item", itemSchema);
