const Food = require('../models/Food');
const logger = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ─── Search Foods ─────────────────────────────────────────────
// GET /api/v1/foods/search?q=dal&page=1&limit=10
const searchFoods = async (req, res) => {
  try {
    const { q, page = 1, limit = 10, category } = req.query;

    if (!q || q.trim().length === 0) {
      return errorResponse(res, 400, 'Search query is required');
    }

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    // Build search query
    const searchQuery = {
      $text: { $search: q.trim() },
    };

    // Optional category filter
    if (category) {
      searchQuery.category = category;
    }

    // Run search
    const [foods, total] = await Promise.all([
      Food.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limitNum)
        .select('-__v -createdAt -updatedAt'),
      Food.countDocuments(searchQuery),
    ]);

    logger.info(`Food search: "${q}" → ${total} results`);

    return successResponse(res, 200, 'Foods found', {
      foods,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    logger.error(`searchFoods error: ${error.message}`);
    return errorResponse(res, 500, 'Search failed. Please try again.');
  }
};

// ─── Get Food By ID ───────────────────────────────────────────
// GET /api/v1/foods/:id
const getFoodById = async (req, res) => {
  try {
    const food = await Food.findById(req.params.id).select('-__v');

    if (!food) {
      return errorResponse(res, 404, 'Food not found');
    }

    return successResponse(res, 200, 'Food found', { food });

  } catch (error) {
    logger.error(`getFoodById error: ${error.message}`);
    return errorResponse(res, 500, 'Something went wrong');
  }
};

// ─── Get Foods By Category ────────────────────────────────────
// GET /api/v1/foods/category/:category
const getFoodsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    const [foods, total] = await Promise.all([
      Food.find({ category: new RegExp(category, 'i') })
        .skip(skip)
        .limit(limitNum)
        .select('-__v -createdAt -updatedAt'),
      Food.countDocuments({ category: new RegExp(category, 'i') }),
    ]);

    return successResponse(res, 200, 'Foods found', {
      foods,
      pagination: {
        total,
        page:       pageNum,
        limit:      limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (error) {
    logger.error(`getFoodsByCategory error: ${error.message}`);
    return errorResponse(res, 500, 'Something went wrong');
  }
};

// ─── Add Custom Food ──────────────────────────────────────────
// POST /api/v1/foods/custom
const addCustomFood = async (req, res) => {
  try {
    const { name, category, per100g, tags } = req.body;

    if (!name || !category || !per100g) {
      return errorResponse(res, 400, 'Name, category and per100g are required');
    }

    const food = await Food.create({
      name,
      category,
      per100g,
      tags:      tags || [],
      source:    'custom',
      createdBy: req.user?.uid || null,
    });

    return successResponse(res, 201, 'Custom food added', { food });

  } catch (error) {
    logger.error(`addCustomFood error: ${error.message}`);
    return errorResponse(res, 500, 'Failed to add custom food');
  }
};

// ─── Get All Categories ───────────────────────────────────────
// GET /api/v1/foods/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Food.distinct('category');
    return successResponse(res, 200, 'Categories found', { categories });
  } catch (error) {
    logger.error(`getCategories error: ${error.message}`);
    return errorResponse(res, 500, 'Something went wrong');
  }
};

module.exports = {
  searchFoods,
  getFoodById,
  getFoodsByCategory,
  addCustomFood,
  getCategories,
};