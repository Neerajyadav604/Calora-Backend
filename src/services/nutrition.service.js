const NutritionLog = require('../models/NutritionLog');
const { getTodayDate, formatDate, DEFAULT_TIME_ZONE } = require('../utils/date.utils');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
const TRACKED_TOTALS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'water'];

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const shiftDateString = (dateString, dayOffset = 0) => {
  const match = String(dateString || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw createHttpError(400, 'Date must be in YYYY-MM-DD format');
  }

  const [, year, month, day] = match;
  const shifted = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + dayOffset));
  return shifted.toISOString().slice(0, 10);
};

const buildZeroTotals = () =>
  TRACKED_TOTALS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sanitizeDate = (dateInput, timeZone = DEFAULT_TIME_ZONE) => {
  if (!dateInput) {
    return getTodayDate(timeZone);
  }

  if (dateInput instanceof Date) {
    return formatDate(dateInput, timeZone);
  }

  if (typeof dateInput === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      throw createHttpError(400, 'Date must be in YYYY-MM-DD format');
    }

    return dateInput;
  }

  throw createHttpError(400, 'Invalid date value');
};

const buildEmptyLog = (userId, date) => ({
  userId,
  date,
  totals: buildZeroTotals(),
  meals: {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  },
  micronutrients: {},
});

const getOrCreateDailyLog = async (userId, dateInput, timeZone = DEFAULT_TIME_ZONE) => {
  if (!userId) {
    throw createHttpError(400, 'User ID is required');
  }

  const date = sanitizeDate(dateInput, timeZone);

  return NutritionLog.findOneAndUpdate(
    { userId, date },
    { $setOnInsert: buildEmptyLog(userId, date) },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
};

const getDailyLog = async (userId, dateInput, timeZone = DEFAULT_TIME_ZONE) => {
  const date = sanitizeDate(dateInput, timeZone);
  return NutritionLog.findOne({ userId, date });
};

const getHistory = async (userId, { from, to, limit = 30 } = {}, timeZone = DEFAULT_TIME_ZONE) => {
  if (!userId) {
    throw createHttpError(400, 'User ID is required');
  }

  const query = { userId };

  if (from || to) {
    query.date = {};
    if (from) {
      query.date.$gte = sanitizeDate(from, timeZone);
    }
    if (to) {
      query.date.$lte = sanitizeDate(to, timeZone);
    }
  }

  return NutritionLog.find(query).sort({ date: -1 }).limit(toFiniteNumber(limit, 30));
};

const buildDailySummary = (log) => {
  if (!log) {
    return null;
  }

  return {
    id: log._id,
    userId: log.userId,
    date: log.date,
    totals: log.totals,
    meals: log.meals,
    micronutrients: log.micronutrients || {},
    meta: {
      foodItemCount: MEAL_TYPES.reduce((count, mealType) => count + (log.meals?.[mealType]?.length || 0), 0),
      updatedAt: log.updatedAt,
      createdAt: log.createdAt,
    },
  };
};

const buildEmptyDailySummary = (userId, date) => ({
  id: null,
  userId,
  date,
  totals: buildZeroTotals(),
  meals: {
    breakfast: [],
    lunch: [],
    dinner: [],
    snacks: [],
  },
  micronutrients: {},
  meta: {
    foodItemCount: 0,
    updatedAt: null,
    createdAt: null,
  },
});

const buildDateRange = (start, end) => {
  const matchStart = String(start || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const matchEnd = String(end || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!matchStart || !matchEnd) {
    throw createHttpError(400, 'Date must be in YYYY-MM-DD format');
  }

  const startUtc = Date.UTC(Number(matchStart[1]), Number(matchStart[2]) - 1, Number(matchStart[3]));
  const endUtc = Date.UTC(Number(matchEnd[1]), Number(matchEnd[2]) - 1, Number(matchEnd[3]));

  if (startUtc > endUtc) {
    throw createHttpError(400, 'Start date cannot be after end date');
  }

  const dates = [];
  for (let cursor = startUtc; cursor <= endUtc; cursor += 24 * 60 * 60 * 1000) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }

  return dates;
};

const normalizeMealType = (mealType) => {
  const normalized = String(mealType || '').trim().toLowerCase();
  if (!MEAL_TYPES.includes(normalized)) {
    throw createHttpError(400, `mealType must be one of: ${MEAL_TYPES.join(', ')}`);
  }
  return normalized;
};

const normalizeFoodEntry = (payload) => {
  const entry = {
    foodId: payload.foodId ? String(payload.foodId) : null,
    name: String(payload.name || '').trim(),
    quantity: toFiniteNumber(payload.quantity, NaN),
    calories: toFiniteNumber(payload.calories, 0),
    protein: toFiniteNumber(payload.protein, 0),
    carbs: toFiniteNumber(payload.carbs, 0),
    fat: toFiniteNumber(payload.fat, 0),
    fiber: toFiniteNumber(payload.fiber, 0),
    sugar: toFiniteNumber(payload.sugar, 0),
    sodium: toFiniteNumber(payload.sodium, 0),
    water: toFiniteNumber(payload.water, 0),
    timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
  };

  if (!entry.name) {
    throw createHttpError(400, 'Food name is required');
  }

  if (!Number.isFinite(entry.quantity) || entry.quantity < 0) {
    throw createHttpError(400, 'Quantity must be a non-negative number');
  }

  for (const key of TRACKED_TOTALS) {
    if (!Number.isFinite(entry[key]) || entry[key] < 0) {
      throw createHttpError(400, `${key} must be a non-negative number`);
    }
  }

  if (Number.isNaN(entry.timestamp.getTime())) {
    throw createHttpError(400, 'Invalid timestamp');
  }

  return entry;
};

const addFood = async (userId, payload, timeZone = DEFAULT_TIME_ZONE) => {
  const date = sanitizeDate(payload.date, timeZone);
  const mealType = normalizeMealType(payload.mealType);
  const entry = normalizeFoodEntry(payload);

  const log = await getOrCreateDailyLog(userId, date, timeZone);

  log.meals[mealType].push(entry);
  for (const key of TRACKED_TOTALS) {
    log.totals[key] += entry[key];
  }

  await log.save();
  return log;
};

const addWater = async (userId, payload, timeZone = DEFAULT_TIME_ZONE) => {
  const date = sanitizeDate(payload.date, timeZone);
  const amount = toFiniteNumber(payload.amount ?? payload.water, NaN);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, 'Water amount must be a positive number');
  }

  const log = await getOrCreateDailyLog(userId, date, timeZone);
  log.totals.water += amount;

  await log.save();
  return log;
};

const removeFood = async (userId, foodItemId, dateInput, timeZone = DEFAULT_TIME_ZONE) => {
  if (!foodItemId) {
    throw createHttpError(400, 'Food item ID is required');
  }

  const date = sanitizeDate(dateInput, timeZone);
  const log = await getDailyLog(userId, date, timeZone);

  if (!log) {
    throw createHttpError(404, 'Nutrition log not found for the requested date');
  }

  const mealType = MEAL_TYPES.find((type) =>
    log.meals[type].some((item) => String(item._id) === String(foodItemId))
  );

  if (!mealType) {
    throw createHttpError(404, 'Food item not found in the nutrition log');
  }

  const itemIndex = log.meals[mealType].findIndex((item) => String(item._id) === String(foodItemId));
  if (itemIndex === -1) {
    throw createHttpError(404, 'Food item not found in the nutrition log');
  }

  const [removedItem] = log.meals[mealType].splice(itemIndex, 1);

  for (const key of TRACKED_TOTALS) {
    log.totals[key] = Math.max(0, log.totals[key] - toFiniteNumber(removedItem[key], 0));
  }

  await log.save();
  return log;
};

const getAnalyticsWindow = async (userId, { days = 7, endDate } = {}, timeZone = DEFAULT_TIME_ZONE) => {
  const resolvedDays = Math.max(1, Math.min(366, toFiniteNumber(days, 7)));
  const end = sanitizeDate(endDate, timeZone);
  const start = shiftDateString(end, -(resolvedDays - 1));

  const logs = await getHistory(userId, { from: start, to: end, limit: resolvedDays }, timeZone);
  const logByDate = new Map(logs.map((log) => [log.date, log]));
  const timeline = buildDateRange(start, end).map((date) => buildDailySummary(logByDate.get(date)) || buildEmptyDailySummary(userId, date));

  const averages = TRACKED_TOTALS.reduce((acc, key) => {
    acc[key] = Number((timeline.reduce((sum, log) => sum + toFiniteNumber(log.totals?.[key], 0), 0) / timeline.length).toFixed(2));
    return acc;
  }, {});

  return {
    range: {
      start,
      end,
      days: resolvedDays,
    },
    averages,
    logs: timeline,
  };
};

module.exports = {
  MEAL_TYPES,
  TRACKED_TOTALS,
  getOrCreateDailyLog,
  getDailyLog,
  getHistory,
  addFood,
  addWater,
  removeFood,
  buildDailySummary,
  getAnalyticsWindow,
  sanitizeDate,
  createHttpError,
};
