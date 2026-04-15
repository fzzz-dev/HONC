const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  address: String,
  pinCode: String,
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
  },
  cityName: String,
  stateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "State",
  },
  stateName: String,
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
  },
  countryName: String,
});

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "Manufacturer",
        "Distributor",
        "Importer",
        "Trader",
        "Service Provider",
        "",
      ],
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
    },
    addresses: [addressSchema],
    gstNo: {
      type: String,
      default: "",
      trim: true,
    },
    panNo: {
      type: String,
      default: "",
      trim: true,
    },
    emailId1: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    emailId2: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    mobileNo1: {
      type: String,
      default: "",
      trim: true,
    },
    mobileNo2: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

supplierSchema.index({ supplierName: 1 });
supplierSchema.index({ type: 1 });
supplierSchema.index({ active: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);
