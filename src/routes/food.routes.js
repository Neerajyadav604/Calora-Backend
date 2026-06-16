const express = require('express');
const router  = express.Router();

const {
  searchFoods,
  getFoodById,
  getFoodsByCategory,
  addCustomFood,
  getCategories,
} = require('../controllers/foodController');

const { protect } = require('../middlewares/auth');

// ─── Public Routes ────────────────────────────────────────────
router.get('/search',              searchFoods);
router.get('/categories',          getCategories);
router.get('/category/:category',  getFoodsByCategory);
router.get('/:id',                 getFoodById);

// ─── Protected Routes (requires Firebase login) ───────────────
router.post('/custom', protect, addCustomFood);

module.exports = router;