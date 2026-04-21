const mongoose = require("mongoose");

// ── Sub-schema: Detail ────────────────────────────────────────────────────────
const detailSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  inventoryHeadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InventoryHead",
    required: true,
  },
  inventoryHeadName: { type: String, required: true, trim: true },
  subCategory: { type: String, default: "", trim: true },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  itemName: { type: String, required: true, trim: true },
  price: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  discPct: {
    type: Number,
    default: 0,
    min: [0, "Discount percentage cannot be negative"],
    max: [100, "Discount percentage cannot exceed 100"],
  },
  gstPct: {
    type: Number,
    default: 18,
    min: [0, "GST percentage cannot be negative"],
    max: [100, "GST percentage cannot exceed 100"],
  },
  fromDate: {
    type: Date,
    required: [true, "From date is required"],
  },
  toDate: {
    type: Date,
    required: [true, "To date is required"],
  },
  freight: {
    type: Number,
    default: 0,
    min: [0, "Freight cannot be negative"],
  },
  others: {
    type: Number,
    default: 0,
    min: [0, "Others cannot be negative"],
  },
  notes: { type: String, default: "", trim: true },
  createdAt: { type: Date, default: Date.now },
});

// ── Main schema ───────────────────────────────────────────────────────────────
const itemPriceListSchema = new mongoose.Schema(
  {
    listNo: {
      type: String,
      required: [true, "List number is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [
        /^IPL-\d{4}-\d{3}$/,
        "List number must follow format IPL-YYYY-XXX",
      ],
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier ID is required"],
      index: true,
    },
    supplierName: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
      index: true,
    },
    details: {
      type: [detailSchema],
      required: [true, "At least one item detail is required"],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "Price list must contain at least one item",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "active", "archived"],
        message: "Status must be one of: draft, active, archived",
      },
      default: "active",
      index: true,
    },
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
      default: Date.now,
      index: true,
    },
    validTo: {
      type: Date,
      required: false,
    },
    notes: { type: String, default: "", trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
itemPriceListSchema.index({ supplierId: 1, date: -1 });
itemPriceListSchema.index({ listNo: 1 });
itemPriceListSchema.index({ status: 1, isActive: 1 });
itemPriceListSchema.index({
  "details.itemId": 1,
  supplierId: 1,
  validFrom: 1,
  validTo: 1,
});
itemPriceListSchema.index({ createdAt: -1 });

// ── Virtuals ──────────────────────────────────────────────────────────────────
itemPriceListSchema.virtual("totalItems").get(function () {
  return this.details ? this.details.length : 0;
});

itemPriceListSchema.virtual("isExpired").get(function () {
  if (!this.validTo) return false;
  return new Date() > this.validTo;
});

itemPriceListSchema.virtual("daysRemaining").get(function () {
  if (!this.validTo) return null;
  const now = new Date();
  if (now > this.validTo) return 0;
  const diffTime = Math.abs(this.validTo - now);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// ── Validators ────────────────────────────────────────────────────────────────
itemPriceListSchema.pre("validate", function (next) {
  // Validate date range
  if (this.details && Array.isArray(this.details)) {
    for (let detail of this.details) {
      if (detail.fromDate && detail.toDate) {
        if (new Date(detail.fromDate) >= new Date(detail.toDate)) {
          return next(
            new Error(
              `Detail: From date must be before to date (detail ID: ${detail.id})`,
            ),
          );
        }
      }
    }
  }

  // Validate overall dates
  if (this.validFrom && this.validTo) {
    if (new Date(this.validFrom) >= new Date(this.validTo)) {
      return next(new Error("Valid from date must be before valid to date"));
    }
  }

  next();
});

// ── Pre-save hooks ────────────────────────────────────────────────────────────
itemPriceListSchema.pre("save", async function (next) {
  try {
    // Populate supplier info if only ID exists
    if (this.supplierId && !this.supplierName) {
      const supplier = await mongoose
        .model("Supplier")
        .findById(this.supplierId);
      if (!supplier) {
        return next(new Error("Invalid supplier ID"));
      }
      this.supplierName = supplier.supplierName;
    }

    // Validate and populate detail references
    if (this.details && Array.isArray(this.details)) {
      for (let i = 0; i < this.details.length; i++) {
        const detail = this.details[i];

        // Validate item exists
        const item = await mongoose.model("Item").findById(detail.itemId);
        if (!item) {
          return next(
            new Error(
              `Item not found with ID: ${detail.itemId} (detail index: ${i})`,
            ),
          );
        }

        // Validate head exists
        const head = await mongoose
          .model("InventoryHead")
          .findById(detail.inventoryHeadId);
        if (!head) {
          return next(
            new Error(
              `Inventory head not found with ID: ${detail.inventoryHeadId} (detail index: ${i})`,
            ),
          );
        }

        // Update names from references
        detail.itemName = item.itemName;
        detail.inventoryHeadName = head.headName;
        detail.subCategory = item.subCategory || "";
      }
    }

    next();
  } catch (err) {
    next(err);
  }
});

// ── Post-save hooks ──────────────────────────────────────────────────────────
itemPriceListSchema.post("save", function (doc, next) {
  // Log audit trail
  if (doc.createdAt === doc.updatedAt) {
    console.log(`[AUDIT] New price list created: ${doc.listNo}`);
  } else {
    console.log(`[AUDIT] Price list updated: ${doc.listNo}`);
  }
  next();
});

// ── Methods ───────────────────────────────────────────────────────────────────
itemPriceListSchema.methods.calculateLineTotal = function (detailIndex) {
  const detail = this.details[detailIndex];
  if (!detail) return 0;

  const basePrice = detail.price * (1 - detail.discPct / 100);
  const gstAmount = basePrice * (detail.gstPct / 100);
  return basePrice + gstAmount + detail.freight + detail.others;
};

itemPriceListSchema.methods.calculateGrandTotal = function () {
  let total = 0;
  this.details.forEach((_, idx) => {
    total += this.calculateLineTotal(idx);
  });
  return parseFloat(total.toFixed(2));
};

itemPriceListSchema.methods.getPriceForItem = function (itemId) {
  const detail = this.details.find((d) => String(d.itemId) === String(itemId));
  return detail || null;
};

itemPriceListSchema.methods.isValidNow = function () {
  const now = new Date();
  return now >= this.validFrom && (!this.validTo || now <= this.validTo);
};

itemPriceListSchema.methods.toDetailedJSON = function () {
  return {
    _id: this._id,
    listNo: this.listNo,
    supplierId: this.supplierId,
    supplierName: this.supplierName,
    date: this.date,
    details: this.details.map((d, idx) => ({
      ...d.toObject(),
      lineTotal: this.calculateLineTotal(idx),
    })),
    status: this.status,
    validFrom: this.validFrom,
    validTo: this.validTo,
    totalItems: this.totalItems,
    grandTotal: this.calculateGrandTotal(),
    isExpired: this.isExpired,
    daysRemaining: this.daysRemaining,
    isValidNow: this.isValidNow(),
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// ── Export ────────────────────────────────────────────────────────────────────
module.exports =
  mongoose.models.ItemPriceList ||
  mongoose.model("ItemPriceList", itemPriceListSchema);
