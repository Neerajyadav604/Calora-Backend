const mongoose = require('mongoose');

const foodEntrySchema = new mongoose.Schema(
  {
    foodId: {
      type: String,
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    calories: {
      type: Number,
      default: 0,
      min: 0,
    },
    protein: {
      type: Number,
      default: 0,
      min: 0,
    },
    carbs: {
      type: Number,
      default: 0,
      min: 0,
    },
    fat: {
      type: Number,
      default: 0,
      min: 0,
    },
    fiber: {
      type: Number,
      default: 0,
      min: 0,
    },
    sugar: {
      type: Number,
      default: 0,
      min: 0,
    },
    sodium: {
      type: Number,
      default: 0,
      min: 0,
    },
    water: {
      type: Number,
      default: 0,
      min: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const nutritionLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true,
      trim: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    totals: {
      calories: {
        type: Number,
        default: 0,
        min: 0,
      },
      protein: {
        type: Number,
        default: 0,
        min: 0,
      },
      carbs: {
        type: Number,
        default: 0,
        min: 0,
      },
      fat: {
        type: Number,
        default: 0,
        min: 0,
      },
      fiber: {
        type: Number,
        default: 0,
        min: 0,
      },
      sugar: {
        type: Number,
        default: 0,
        min: 0,
      },
      sodium: {
        type: Number,
        default: 0,
        min: 0,
      },
      water: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    meals: {
      breakfast: {
        type: [foodEntrySchema],
        default: [],
      },
      lunch: {
        type: [foodEntrySchema],
        default: [],
      },
      dinner: {
        type: [foodEntrySchema],
        default: [],
      },
      snacks: {
        type: [foodEntrySchema],
        default: [],
      },
    },
    micronutrients: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

nutritionLogSchema.index({ userId: 1, date: 1 }, { unique: true, name: 'uniq_user_daily_log' });
nutritionLogSchema.index({ userId: 1, date: -1 }, { name: 'user_date_desc' });
nutritionLogSchema.index({ date: -1 }, { name: 'date_desc' });
nutritionLogSchema.index({ userId: 1, updatedAt: -1 }, { name: 'user_activity_desc' });

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);
