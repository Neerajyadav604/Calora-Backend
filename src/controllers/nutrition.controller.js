const {
  getOrCreateDailyLog,
  getDailyLog,
  getHistory,
  addFood,
  addWater,
  removeFood,
  buildDailySummary,
  getAnalyticsWindow,
  sanitizeDate,
} = require('../services/nutrition.service');
const { successResponse } = require('../utils/apiResponse');
const { DEFAULT_TIME_ZONE, getTodayDate } = require('../utils/date.utils');

const getTodayNutrition = async (req, res, next) => {
  try {
    const date = getTodayDate(DEFAULT_TIME_ZONE);
    const log = await getOrCreateDailyLog(req.user.uid, date, DEFAULT_TIME_ZONE);

    return successResponse(res, 200, 'Today nutrition log loaded', buildDailySummary(log));
  } catch (error) {
    return next(error);
  }
};

const getNutritionByDate = async (req, res, next) => {
  try {
    const date = sanitizeDate(req.params.date, DEFAULT_TIME_ZONE);
    const today = getTodayDate(DEFAULT_TIME_ZONE);
    const log =
      date === today
        ? await getOrCreateDailyLog(req.user.uid, date, DEFAULT_TIME_ZONE)
        : await getDailyLog(req.user.uid, date, DEFAULT_TIME_ZONE);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Nutrition log not found for the requested date',
      });
    }

    return successResponse(res, 200, 'Nutrition log loaded', buildDailySummary(log));
  } catch (error) {
    return next(error);
  }
};

const getNutritionHistory = async (req, res, next) => {
  try {
    const { from, to, limit, days, includeAnalytics } = req.query;

    if (days || includeAnalytics) {
      const analytics = await getAnalyticsWindow(
        req.user.uid,
        {
          days: days || 7,
          endDate: to,
        },
        DEFAULT_TIME_ZONE
      );

      return successResponse(res, 200, 'Nutrition analytics loaded', analytics);
    }

    const logs = await getHistory(req.user.uid, { from, to, limit }, DEFAULT_TIME_ZONE);

    return successResponse(res, 200, 'Nutrition history loaded', {
      count: logs.length,
      logs: logs.map(buildDailySummary),
    });
  } catch (error) {
    return next(error);
  }
};

const addFoodToNutrition = async (req, res, next) => {
  try {
    const log = await addFood(req.user.uid, req.body, DEFAULT_TIME_ZONE);
    return successResponse(res, 201, 'Food added to nutrition log', buildDailySummary(log));
  } catch (error) {
    return next(error);
  }
};

const addWaterIntake = async (req, res, next) => {
  try {
    const log = await addWater(req.user.uid, req.body, DEFAULT_TIME_ZONE);
    return successResponse(res, 200, 'Water intake updated', buildDailySummary(log));
  } catch (error) {
    return next(error);
  }
};

const deleteFoodFromNutrition = async (req, res, next) => {
  try {
    const date = req.query.date || req.body.date;
    const log = await removeFood(req.user.uid, req.params.id, date, DEFAULT_TIME_ZONE);
    return successResponse(res, 200, 'Food removed from nutrition log', buildDailySummary(log));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getTodayNutrition,
  getNutritionHistory,
  getNutritionByDate,
  addFoodToNutrition,
  addWaterIntake,
  deleteFoodFromNutrition,
};
