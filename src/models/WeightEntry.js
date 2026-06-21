const mongoose = require('mongoose');

const weightEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
      index: true,
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0.000001, 'Weight must be greater than 0'],
    },
    recordedAt: {
      type: Date,
      required: [true, 'Recorded date is required'],
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

weightEntrySchema.index({ userId: 1, recordedAt: -1 }, { name: 'weight_user_recorded_at_idx' });
weightEntrySchema.index({ userId: 1 }, { name: 'weight_user_idx' });
weightEntrySchema.index({ recordedAt: -1 }, { name: 'weight_recorded_at_idx' });

module.exports = mongoose.model('WeightEntry', weightEntrySchema);
