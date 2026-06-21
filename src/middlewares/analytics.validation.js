const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const sendValidationError = (res, message) =>
  res.status(400).json({
    success: false,
    message,
  });

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const validateWeightEntry = (req, res, next) => {
  const weight = toNumber(req.body.weight);

  if (!Number.isFinite(weight) || weight <= 0) {
    return sendValidationError(res, 'weight must be a number greater than 0');
  }

  if (req.body.recordedAt !== undefined && req.body.recordedAt !== null && req.body.recordedAt !== '') {
    const recordedAt = new Date(req.body.recordedAt);
    if (Number.isNaN(recordedAt.getTime())) {
      return sendValidationError(res, 'recordedAt must be a valid date');
    }
  }

  next();
};

const validateSummaryQuery = (req, res, next) => {
  if (req.query.days !== undefined && req.query.days !== null && req.query.days !== '') {
    const days = toNumber(req.query.days);
    if (!Number.isInteger(days) || days <= 0 || days > 365) {
      return sendValidationError(res, 'days must be a whole number between 1 and 365');
    }
  }

  if (req.query.endDate && !DATE_PATTERN.test(String(req.query.endDate))) {
    return sendValidationError(res, 'endDate must be in YYYY-MM-DD format');
  }

  next();
};

const validateWeightHistoryQuery = (req, res, next) => {
  for (const field of ['from', 'to']) {
    if (req.query[field] && !DATE_PATTERN.test(String(req.query[field]))) {
      return sendValidationError(res, `${field} must be in YYYY-MM-DD format`);
    }
  }

  if (req.query.limit !== undefined && req.query.limit !== null && req.query.limit !== '') {
    const limit = toNumber(req.query.limit);
    if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
      return sendValidationError(res, 'limit must be a whole number between 1 and 1000');
    }
  }

  next();
};

module.exports = {
  validateSummaryQuery,
  validateWeightEntry,
  validateWeightHistoryQuery,
};
