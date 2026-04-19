const mongoose = require("mongoose");

const uomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "UOM name is required"],
      trim: true,
      unique: true, // already indexed
    },
    description: {
      type: String,
      default: "",
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

// Keep this (useful for filtering active/inactive)
uomSchema.index({ active: 1 });

module.exports = mongoose.models.Uom || mongoose.model("Uom", uomSchema);
