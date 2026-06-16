const DEFAULT_TIME_ZONE = process.env.APP_TIME_ZONE || process.env.TIME_ZONE || 'Asia/Kolkata';

const DATE_FORMATTER_CACHE = new Map();
const OFFSET_FORMATTER_CACHE = new Map();

const getDateFormatter = (timeZone = DEFAULT_TIME_ZONE) => {
  const cacheKey = timeZone;
  if (!DATE_FORMATTER_CACHE.has(cacheKey)) {
    DATE_FORMATTER_CACHE.set(
      cacheKey,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    );
  }

  return DATE_FORMATTER_CACHE.get(cacheKey);
};

const getOffsetFormatter = (timeZone = DEFAULT_TIME_ZONE) => {
  const cacheKey = timeZone;
  if (!OFFSET_FORMATTER_CACHE.has(cacheKey)) {
    OFFSET_FORMATTER_CACHE.set(
      cacheKey,
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZoneName: 'shortOffset',
      })
    );
  }

  return OFFSET_FORMATTER_CACHE.get(cacheKey);
};

const normalizeDateInput = (input) => {
  if (!input) {
    return new Date();
  }

  if (input instanceof Date) {
    return input;
  }

  if (typeof input === 'string') {
    const dateOnlyMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }

    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  throw new Error('Invalid date input');
};

const getZonedDateParts = (date, timeZone = DEFAULT_TIME_ZONE) => {
  const formatter = getDateFormatter(timeZone);
  const parts = formatter.formatToParts(normalizeDateInput(date));
  const values = {};

  for (const part of parts) {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
  };
};

const formatDate = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
};

const getTodayDate = (timeZone = DEFAULT_TIME_ZONE) => formatDate(new Date(), timeZone);

const getTimeZoneOffsetMinutes = (date, timeZone = DEFAULT_TIME_ZONE) => {
  const formatter = getOffsetFormatter(timeZone);
  const parts = formatter.formatToParts(normalizeDateInput(date));
  const timeZoneName = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT+00:00';
  const match = timeZoneName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);

  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
};

const zonedMidnightToUtc = (dateInput, timeZone = DEFAULT_TIME_ZONE) => {
  const { year, month, day } = getZonedDateParts(dateInput, timeZone);
  const baseUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);

  const firstOffset = getTimeZoneOffsetMinutes(baseUtc, timeZone);
  let utcInstant = baseUtc - firstOffset * 60 * 1000;
  const secondOffset = getTimeZoneOffsetMinutes(utcInstant, timeZone);

  if (secondOffset !== firstOffset) {
    utcInstant = baseUtc - secondOffset * 60 * 1000;
  }

  return new Date(utcInstant);
};

const getStartOfDay = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => zonedMidnightToUtc(date, timeZone);

const getEndOfDay = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const startOfDay = getStartOfDay(date, timeZone);
  return new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);
};

const isSameDay = (left, right, timeZone = DEFAULT_TIME_ZONE) =>
  formatDate(left, timeZone) === formatDate(right, timeZone);

module.exports = {
  DEFAULT_TIME_ZONE,
  formatDate,
  getTodayDate,
  isSameDay,
  getStartOfDay,
  getEndOfDay,
  normalizeDateInput,
  getZonedDateParts,
  getTimeZoneOffsetMinutes,
};
