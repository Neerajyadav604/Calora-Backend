const express = require('express');
const router = express.Router();

const {
  getTodayNutrition,
  getNutritionHistory,
  getNutritionByDate,
  addFoodToNutrition,
  addWaterIntake,
  deleteFoodFromNutrition,
} = require('../controllers/nutrition.controller');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/today', getTodayNutrition);
router.get('/history', getNutritionHistory);
router.get('/date/:date', getNutritionByDate);
router.post('/add-food', addFoodToNutrition);
router.post('/water', addWaterIntake);
router.delete('/food/:id', deleteFoodFromNutrition);

module.exports = router;
