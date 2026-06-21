const express = require('express');
const router = express.Router();

const {
  addWeight,
  getWeightHistory,
  getAnalyticsSummary,
} = require('../controllers/analytics.controller');
const { protect } = require('../middlewares/auth');
const {
  validateSummaryQuery,
  validateWeightEntry,
  validateWeightHistoryQuery,
} = require('../middlewares/analytics.validation');

router.use(protect);

router.post('/weight', validateWeightEntry, addWeight);
router.get('/weight/history', validateWeightHistoryQuery, getWeightHistory);
router.get('/summary', validateSummaryQuery, getAnalyticsSummary);

module.exports = router;
