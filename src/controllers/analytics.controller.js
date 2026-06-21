const { successResponse } = require('../utils/apiResponse');
const {
  addWeightEntry: createWeightEntry,
  getWeightHistory: listWeightHistory,
  getAnalyticsSummary: buildAnalyticsSummary,
} = require('../services/analytics.service');

const addWeight = async (req, res, next) => {
  try {
    const entry = await createWeightEntry(req.user.uid, req.body);
    return successResponse(res, 201, 'Weight entry recorded', {
      id: entry._id,
      userId: entry.userId,
      weight: entry.weight,
      recordedAt: entry.recordedAt,
    });
  } catch (error) {
    return next(error);
  }
};

const getWeightHistory = async (req, res, next) => {
  try {
    const history = await listWeightHistory(req.user.uid, req.query);
    return successResponse(res, 200, 'Weight history loaded', history);
  } catch (error) {
    return next(error);
  }
};

const getAnalyticsSummary = async (req, res, next) => {
  try {
    const summary = await buildAnalyticsSummary(req.user.uid, req.query);
    return successResponse(res, 200, 'Analytics summary loaded', summary);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  addWeight,
  getWeightHistory,
  getAnalyticsSummary,
};
