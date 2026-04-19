const mongoose = require("mongoose");

const inventoryHeadSchema = new mongoose.Schema(
  {
    headName: {
      type: String,
      required: [true, "Head name is required"],
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

inventoryHeadSchema.index({ headName: 1 });
inventoryHeadSchema.index({ active: 1 });

const InventoryHead =
  mongoose.models.InventoryHead ||
  mongoose.model("InventoryHead", inventoryHeadSchema);

module.exports = InventoryHead;