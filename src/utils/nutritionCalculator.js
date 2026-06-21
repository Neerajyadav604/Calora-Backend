const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  veryActive: 1.725,
  extraActive: 1.9,
};

const GOAL_ADJUSTMENTS = {
  lose: -500,
  maintain: 0,
  gain: 500,
};

const MACRO_SPLITS = {
  lose: { protein: 0.35, carbs: 0.35, fats: 0.3 },
  maintain: { protein: 0.3, carbs: 0.4, fats: 0.3 },
  gain: { protein: 0.25, carbs: 0.5, fats: 0.25 },
};

const toFiniteNumber = (value, fallback = NaN) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeActivityLevel = (activityLevel) => {
  const value = String(activityLevel || '').trim();

  if (ACTIVITY_MULTIPLIERS[value] !== undefined) {
    return value;
  }

  const lower = value.toLowerCase();

  if (lower === 'sedentary') return 'sedentary';
  if (lower === 'light' || lower === 'lightly active') return 'light';
  if (lower === 'moderate' || lower === 'moderately active') return 'moderate';
  if (lower === 'very active') return 'veryActive';
  if (lower === 'extra active' || lower === 'extraActive') return 'extraActive';

  return null;
};

const normalizeGoalType = (goalType) => {
  const value = String(goalType || '').trim().toLowerCase();

  if (value === 'lose' || value === 'fat_loss' || value === 'weight_loss') return 'lose';
  if (value === 'maintain' || value === 'maintain_weight' || value === 'maintenance') return 'maintain';
  if (value === 'gain' || value === 'bulk' || value === 'muscle_gain') return 'gain';

  return null;
};

const calculateBmr = ({ weightKg, heightCm, age, gender }) => {
  const weight = toFiniteNumber(weightKg, NaN);
  const height = toFiniteNumber(heightCm, NaN);
  const years = toFiniteNumber(age, NaN);
  const normalizedGender = String(gender || '').trim().toLowerCase();

  if (![weight, height, years].every(Number.isFinite)) {
    const error = new Error('Weight, height, and age are required to calculate nutrition targets');
    error.statusCode = 400;
    throw error;
  }

  const base = 10 * weight + 6.25 * height - 5 * years;

  if (normalizedGender === 'male') {
    return base + 5;
  }

  if (normalizedGender === 'female') {
    return base - 161;
  }

  return base - 78;
};

const calculateNutritionTargets = (profile = {}) => {
  const weightKg = toFiniteNumber(profile.weightKg ?? profile.weight, NaN);
  const heightCm = toFiniteNumber(profile.heightCm ?? profile.height, NaN);
  const age = toFiniteNumber(profile.age, NaN);
  const gender = profile.gender;
  const activityLevel = normalizeActivityLevel(profile.activityLevel);
  const goalType = normalizeGoalType(profile.goalType);

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    const error = new Error('weightKg must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(heightCm) || heightCm <= 0) {
    const error = new Error('heightCm must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(age) || age <= 0) {
    const error = new Error('age must be a positive number');
    error.statusCode = 400;
    throw error;
  }

  if (!activityLevel) {
    const error = new Error('activityLevel is invalid');
    error.statusCode = 400;
    throw error;
  }

  if (!goalType) {
    const error = new Error('goalType is invalid');
    error.statusCode = 400;
    throw error;
  }

  const bmr = Math.round(calculateBmr({ weightKg, heightCm, age, gender }));
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
  const targetCalories = Math.max(1, Math.round(tdee + GOAL_ADJUSTMENTS[goalType]));
  const split = MACRO_SPLITS[goalType];

  const protein = Math.max(1, Math.round((targetCalories * split.protein) / 4));
  const fats = Math.max(1, Math.round((targetCalories * split.fats) / 9));
  const proteinCalories = protein * 4;
  const fatCalories = fats * 9;
  const carbs = Math.max(1, Math.round((targetCalories - proteinCalories - fatCalories) / 4));

  return {
    bmr,
    tdee,
    targetCalories,
    macros: {
      protein,
      carbs,
      fats,
    },
  };
};

module.exports = {
  ACTIVITY_MULTIPLIERS,
  GOAL_ADJUSTMENTS,
  calculateNutritionTargets,
  normalizeActivityLevel,
  normalizeGoalType,
};
