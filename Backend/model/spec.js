const mongoose = require("mongoose");

const specSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// Case-insensitive unique index on name
specSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

module.exports = mongoose.model("Spec", specSchema);
