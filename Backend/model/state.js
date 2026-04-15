const mongoose = require("mongoose");

const stateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "State name is required"],
      trim: true,
    },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country", // 🔥 IMPORTANT
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
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

stateSchema.index({ countryId: 1, name: 1 });
stateSchema.index({ active: 1 });

module.exports = mongoose.model("State", stateSchema);
