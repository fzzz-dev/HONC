const mongoose = require("mongoose");

// Store Model
const storeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
    },
    location: {
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

storeSchema.index({ name: 1 });
storeSchema.index({ active: 1 });

// Department Model
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
    },
    code: {
      type: String,
      default: "",
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

departmentSchema.index({ name: 1 });
departmentSchema.index({ active: 1 });

// Process Model
const processSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Process name is required"],
      trim: true,
    },
    department: {
      type: String,
      default: "",
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

processSchema.index({ name: 1 });
processSchema.index({ department: 1 });
processSchema.index({ active: 1 });

const Store = mongoose.model("Store", storeSchema);
const Department = mongoose.model("Department", departmentSchema);
const Process = mongoose.model("Process", processSchema);

module.exports = { Store, Department, Process };
