const mongoose = require("mongoose");

const supplierTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier type name is required"],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: "#5F5E5A",
      trim: true,
    },
    bgColor: {
      type: String,
      default: "#F1EFE8",
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster searches
supplierTypeSchema.index({ name: 1 });
supplierTypeSchema.index({ active: 1 });
supplierTypeSchema.index({ order: 1 });

module.exports = mongoose.model("SupplierType", supplierTypeSchema);
