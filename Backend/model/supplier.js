const mongoose = require("mongoose");

// ── Sub-schema: address ───────────────────────────────────────────────────────
const addressSchema = new mongoose.Schema({
  address: {
    type: String,
    required: [true, "Address is required"],
    trim: true,
  },
  pinCode: { type: String, trim: true },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: "City", required: true },
  cityName: { type: String, required: true },
  stateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "State",
    required: true,
  },
  stateName: { type: String, required: true },
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Country",
    required: true,
  },
  countryName: { type: String, required: true },
  note: { type: String, trim: true, default: "" },
  isPrimary: { type: Boolean, default: false },
});

// ── Main schema ───────────────────────────────────────────────────────────────
const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    type: {
      type: String,
      required: [true, "Supplier type is required"],
      trim: true,
    },
    active: { type: Boolean, default: true },
    state: { type: String, default: "", trim: true },
    addresses: { type: [addressSchema], default: [] },
    gstNo: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: (v) =>
          !v ||
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
        message: "Invalid GST number format",
      },
    },
    panNo: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: (v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v),
        message: "Invalid PAN number format",
      },
    },
    emailId1: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email format",
      },
    },
    emailId2: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Invalid email format",
      },
    },
    mobileNo1: { type: String, trim: true },
    mobileNo2: { type: String, trim: true },
  },
  { timestamps: true },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
supplierSchema.index({ supplierName: 1, type: 1 });
supplierSchema.index({ active: 1 });
supplierSchema.index({ gstNo: 1 });
supplierSchema.index({ "addresses.cityId": 1 });
supplierSchema.index({ "addresses.stateId": 1 });

// ── Virtual ───────────────────────────────────────────────────────────────────
supplierSchema.virtual("primaryAddress").get(function () {
  return this.addresses.find((a) => a.isPrimary) || this.addresses[0];
});

// ── Pre-save hook (only once, after schema is defined) ────────────────────────
supplierSchema.pre("save", function () {
  if (this.addresses?.length > 0) {
    const hasPrimary = this.addresses.some((a) => a.isPrimary);
    if (!hasPrimary) this.addresses[0].isPrimary = true;
  }

  if (!this.state && this.addresses?.length > 0) {
    const primary =
      this.addresses.find((a) => a.isPrimary) || this.addresses[0];
    this.state = primary.stateName || "";
  }
});

// ── Export ────────────────────────────────────────────────────────────────────
module.exports =
  mongoose.models.Supplier || mongoose.model("Supplier", supplierSchema);
