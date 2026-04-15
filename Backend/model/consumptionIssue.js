const mongoose = require('mongoose');

const issueDetailSchema = new mongoose.Schema({
  category: String,
  subCategory: String,
  itemName: String,
  grnNo: String,
  stkQty: {
    type: Number,
    default: 0,
  },
  issueQty: {
    type: Number,
    default: 0,
  },
  rate: {
    type: Number,
    default: 0,
  },
  amount: {
    type: Number,
    default: 0,
  },
});

const consumptionIssueSchema = new mongoose.Schema(
  {
    issNo: {
      type: String,
      required: [true, 'Issue number is required'],
      unique: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    departmentName: {
      type: String,
      required: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: [true, 'Store is required'],
    },
    storeName: {
      type: String,
      required: true,
    },
    details: [issueDetailSchema],
  },
  {
    timestamps: true,
  }
);

consumptionIssueSchema.index({ issNo: 1 });
consumptionIssueSchema.index({ departmentId: 1 });
consumptionIssueSchema.index({ storeId: 1 });
consumptionIssueSchema.index({ date: 1 });

module.exports = mongoose.model('ConsumptionIssue', consumptionIssueSchema);