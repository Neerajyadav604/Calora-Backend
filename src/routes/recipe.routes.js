const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/auth')
const { uploadRecipeImage } = require('../middlewares/upload.middleware')
const rc = require('../controllers/recipe.controller')

// Public
router.get('/featured',          rc.getFeatured)       // Daily Featured section
router.get('/traditional',       rc.getTraditional)    // Traditional Favorites section
router.get('/quick',             rc.getQuickBites)     // Quick Healthy Bites section
router.get('/search',            rc.search)            // Search recipes
router.get('/filter',            rc.filter)            // Filter by tag (High Protein, Vegan etc.)
router.get('/:id',               rc.getById)           // Recipe detail page

// Protected (user must be logged in)
router.post('/',                 protect, uploadRecipeImage, rc.create)      // Publish new recipe
router.put('/:id',               protect, uploadRecipeImage, rc.update)      // Edit own recipe
router.delete('/:id',            protect, rc.remove)      // Delete own recipe
router.post('/:id/save',         protect, rc.saveRecipe)  // Bookmark recipe
router.post('/:id/unsave',       protect, rc.unsaveRecipe)// Remove bookmark

module.exports = router
