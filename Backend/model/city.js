const mongoose = require("mongoose");

const citySchema = new mongoose.Schema(
  {
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "State",
      required: [true, "State is required"],
    },
    stateName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: [true, "City name is required"],
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

citySchema.index({ stateId: 1, name: 1 });
citySchema.index({ active: 1 });

module.exports = mongoose.model("City", citySchema);
