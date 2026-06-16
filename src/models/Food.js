const mongoose = require('mongoose');

const foodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    per100g: {
      calories:  { type: Number, default: 0 },
      protein:   { type: Number, default: 0 },
      carbs:     { type: Number, default: 0 },
      fat:       { type: Number, default: 0 },
      iron:      { type: Number, default: 0 },
      vitamin_c: { type: Number, default: 0 },
    },
    tags: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      enum: ['kaggle', 'custom', 'openfoodfacts'],
      default: 'kaggle',
    },
    createdBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Text index for search ────────────────────────────────────
foodSchema.index({ name: 'text', category: 'text', tags: 'text' });

const Food = mongoose.model('Food', foodSchema);

module.exports = Food;