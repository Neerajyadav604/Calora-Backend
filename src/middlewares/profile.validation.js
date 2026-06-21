const positiveNumberFields = ['targetCalories', 'protein', 'carbs', 'fats'];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const sendValidationError = (res, message) =>
  res.status(400).json({
    success: false,
    message,
  });

const validateManualMacroTargets = (req, res, next) => {
  for (const field of positiveNumberFields) {
    if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
      return sendValidationError(res, `${field} is required`);
    }

    const value = toNumber(req.body[field]);
    if (!Number.isFinite(value)) {
      return sendValidationError(res, `${field} must be a number`);
    }

    if (value <= 0) {
      return sendValidationError(res, `${field} must be greater than 0`);
    }
  }

  next();
};

const validateProfileUpdate = (req, res, next) => {
  const numericFields = ['weightKg', 'heightCm', 'age'];

  for (const field of numericFields) {
    if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== '') {
      const value = toNumber(req.body[field]);
      if (!Number.isFinite(value) || value <= 0) {
        return sendValidationError(res, `${field} must be a number greater than 0`);
      }
    }
  }

  if (req.body.activityLevel !== undefined) {
    const allowed = ['sedentary', 'light', 'moderate', 'veryActive', 'extraActive'];
    const normalized = String(req.body.activityLevel).trim();
    const lower = normalized.toLowerCase();
    if (!allowed.includes(normalized) && !['sedentary', 'lightly active', 'moderately active', 'very active', 'extra active'].includes(lower)) {
      return sendValidationError(res, 'activityLevel is invalid');
    }
  }

  if (req.body.goalType !== undefined) {
    const allowed = ['lose', 'maintain', 'gain', 'fat_loss', 'weight_loss', 'maintenance', 'maintain_weight', 'bulk', 'muscle_gain'];
    const normalized = String(req.body.goalType).trim().toLowerCase();
    if (!allowed.includes(normalized)) {
      return sendValidationError(res, 'goalType is invalid');
    }
  }

  if (req.body.gender !== undefined) {
    const normalized = String(req.body.gender).trim().toLowerCase();
    const allowed = ['male', 'female', 'other'];
    if (!allowed.includes(normalized)) {
      return sendValidationError(res, 'gender is invalid');
    }
  }

  next();
};

module.exports = {
  validateManualMacroTargets,
  validateProfileUpdate,
};
