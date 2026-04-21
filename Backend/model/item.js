const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryHead",
      required: true,
    },
    head: { type: String, required: true },
    group: { type: String, default: "" },
    subCategory: { type: String, default: "" },
    itemName: { type: String, required: true, trim: true },
    uom: { type: String, default: "" },
    make: { type: String, default: "" },
    spec: { type: String, default: "" },
    itemDescription: { type: String, default: "" },
    rate: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    image: { type: String, default: null }, // base64 or URL
  },
  { timestamps: true },
);

module.exports = mongoose.model("Item", itemSchema);
