const mongoose = require("mongoose");

const processSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Process name is required"],
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    departmentName: {
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
  }
);

processSchema.index({ name: 1 });
processSchema.index({ departmentId: 1 });
processSchema.index({ active: 1 });

module.exports = mongoose.model("Process", processSchema);