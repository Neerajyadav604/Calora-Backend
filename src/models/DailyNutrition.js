const mongoose = require('mongoose');

const dailyNutritionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true,
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      trim: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
      index: true,
    },
    totalCalories: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalProtein: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCarbs: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFat: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWater: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

dailyNutritionSchema.index({ userId: 1, date: 1 }, { unique: true, name: 'uniq_user_daily_nutrition' });
dailyNutritionSchema.index({ userId: 1 }, { name: 'daily_nutrition_user_idx' });
dailyNutritionSchema.index({ date: -1 }, { name: 'daily_nutrition_date_idx' });

module.exports = mongoose.model('DailyNutrition', dailyNutritionSchema);
