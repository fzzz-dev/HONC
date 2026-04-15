const mongoose = require("mongoose");

const mainCategorySchema = new mongoose.Schema(
  {
    headId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryHead",
      required: [true, "Inventory head is required"],
    },
    headName: {
      type: String,
      required: true,
    },
    groupName: {
      type: String,
      required: [true, "Group name is required"],
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

mainCategorySchema.index({ headId: 1, groupName: 1 });
mainCategorySchema.index({ active: 1 });

module.exports = mongoose.model("MainCategory", mainCategorySchema);
