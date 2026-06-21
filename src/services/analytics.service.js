const DailyNutrition = require('../models/DailyNutrition');
const WeightEntry = require('../models/WeightEntry');
const {
  DEFAULT_TIME_ZONE,
  formatDate,
  getTodayDate,
  getStartOfDay,
  getEndOfDay,
} = require('../utils/date.utils');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toFiniteNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const shiftDateString = (dateString, dayOffset = 0) => {
  const match = String(dateString || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw createHttpError(400, 'Date must be in YYYY-MM-DD format');
  }

  const [, year, month, day] = match;
  const shifted = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + dayOffset));
  return shifted.toISOString().slice(0, 10);
};

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
  for (let cursor = startUtc; cursor <= endUtc; cursor += MS_PER_DAY) {
    dates.push(new Date(cursor).toISOString().slice(0, 10));
  }

  return dates;
};

const normalizeRecordedAt = (value) => {
  if (!value) {
    return new Date();
  }

  const recordedAt = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(recordedAt.getTime())) {
    throw createHttpError(400, 'Invalid recordedAt value');
  }

  return recordedAt;
};

const parseWeightPayload = (payload = {}) => {
  const weight = toFiniteNumber(payload.weight, NaN);

  if (!Number.isFinite(weight) || weight <= 0) {
    throw createHttpError(400, 'weight must be a number greater than 0');
  }

  return {
    weight,
    recordedAt: normalizeRecordedAt(payload.recordedAt),
  };
};

const syncDailyNutritionFromLog = async (log) => {
  if (!log?.userId || !log?.date) {
    throw createHttpError(400, 'A valid nutrition log is required for analytics sync');
  }

  const payload = {
    userId: String(log.userId).trim(),
    date: sanitizeDate(log.date, DEFAULT_TIME_ZONE),
    totalCalories: toFiniteNumber(log.totals?.calories, 0),
    totalProtein: toFiniteNumber(log.totals?.protein, 0),
    totalCarbs: toFiniteNumber(log.totals?.carbs, 0),
    totalFat: toFiniteNumber(log.totals?.fat, 0),
    totalWater: toFiniteNumber(log.totals?.water, 0),
  };

  return DailyNutrition.findOneAndUpdate(
    { userId: payload.userId, date: payload.date },
    { $set: payload },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
};

const addWeightEntry = async (userId, payload = {}) => {
  if (!userId) {
    throw createHttpError(400, 'User ID is required');
  }

  const parsed = parseWeightPayload(payload);

  return WeightEntry.create({
    userId: String(userId).trim(),
    weight: parsed.weight,
    recordedAt: parsed.recordedAt,
  });
};

const getWeightHistory = async (userId, { from, to, limit = 50 } = {}, timeZone = DEFAULT_TIME_ZONE) => {
  if (!userId) {
    throw createHttpError(400, 'User ID is required');
  }

  const query = { userId: String(userId).trim() };

  if (from || to) {
    query.recordedAt = {};
    if (from) {
      const fromDate = sanitizeDate(from, timeZone);
      query.recordedAt.$gte = getStartOfDay(fromDate, timeZone);
    }
    if (to) {
      const toDate = sanitizeDate(to, timeZone);
      query.recordedAt.$lte = getEndOfDay(toDate, timeZone);
    }
  }

  const resolvedLimit = Math.max(1, Math.min(1000, Math.trunc(toFiniteNumber(limit, 50))));

  const [totalCount, entries] = await Promise.all([
    WeightEntry.countDocuments(query),
    WeightEntry.find(query)
      .sort({ recordedAt: -1 })
      .limit(resolvedLimit),
  ]);

  return {
    count: totalCount,
    entries: entries.map((entry) => ({
      id: entry._id,
      userId: entry.userId,
      weight: entry.weight,
      recordedAt: entry.recordedAt,
    })),
  };
};

const getAnalyticsSummary = async (userId, { days = 7, endDate } = {}, timeZone = DEFAULT_TIME_ZONE) => {
  if (!userId) {
    throw createHttpError(400, 'User ID is required');
  }

  const resolvedDays = Math.max(1, Math.min(365, Math.trunc(toFiniteNumber(days, 7))));
  const resolvedEnd = sanitizeDate(endDate, timeZone);
  const resolvedStart = shiftDateString(resolvedEnd, -(resolvedDays - 1));

  const [dailyRecords, weightRecords] = await Promise.all([
    DailyNutrition.find({
      userId: String(userId).trim(),
      date: {
        $gte: resolvedStart,
        $lte: resolvedEnd,
      },
    }).sort({ date: 1 }),
    WeightEntry.find({
      userId: String(userId).trim(),
      recordedAt: {
        $gte: getStartOfDay(resolvedStart, timeZone),
        $lte: getEndOfDay(resolvedEnd, timeZone),
      },
    }).sort({ recordedAt: 1 }),
  ]);

  const byDate = new Map(dailyRecords.map((record) => [record.date, record]));
  const dates = buildDateRange(resolvedStart, resolvedEnd);

  const calorieTrend = [];
  const macroTrend = [];
  let caloriesSum = 0;
  let proteinSum = 0;
  let carbsSum = 0;
  let fatSum = 0;

  for (const date of dates) {
    const record = byDate.get(date);
    const totalCalories = toFiniteNumber(record?.totalCalories, 0);
    const totalProtein = toFiniteNumber(record?.totalProtein, 0);
    const totalCarbs = toFiniteNumber(record?.totalCarbs, 0);
    const totalFat = toFiniteNumber(record?.totalFat, 0);

    calorieTrend.push({
      date,
      calories: totalCalories,
    });

    macroTrend.push({
      date,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    });

    if (record) {
      caloriesSum += totalCalories;
      proteinSum += totalProtein;
      carbsSum += totalCarbs;
      fatSum += totalFat;
    }
  }

  const daysTracked = dailyRecords.length;
  const divisor = daysTracked > 0 ? daysTracked : 1;

  return {
    daysTracked,
    averageCalories: Number((caloriesSum / divisor).toFixed(2)),
    averageProtein: Number((proteinSum / divisor).toFixed(2)),
    averageCarbs: Number((carbsSum / divisor).toFixed(2)),
    averageFat: Number((fatSum / divisor).toFixed(2)),
    calorieTrend,
    macroTrend,
    weightTrend: weightRecords.map((entry) => ({
      id: entry._id,
      weight: entry.weight,
      recordedAt: entry.recordedAt,
      date: formatDate(entry.recordedAt, timeZone),
    })),
    range: {
      start: resolvedStart,
      end: resolvedEnd,
      days: resolvedDays,
    },
  };
};

module.exports = {
  addWeightEntry,
  getAnalyticsSummary,
  getWeightHistory,
  syncDailyNutritionFromLog,
  createHttpError,
  sanitizeDate,
};
