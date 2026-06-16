const Recipe = require('../models/Recipe')
const { uploadImage, deleteImage } = require('../services/cloudinary.service')

// Keep the existing recipe API shape, but move image storage from Firebase to Cloudinary.
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key)

const parseMaybeJson = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  if (!trimmed) return fallback

  try {
    return JSON.parse(trimmed)
  } catch (error) {
    return value
  }
}

const toNumber = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toStringArray = (value) => {
  const parsed = parseMaybeJson(value, value)
  if (Array.isArray(parsed)) {
    return parsed.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof parsed === 'string') {
    return parsed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

const normalizeRecipePayload = (body, recipe = null) => {
  const payload = {}

  if (hasOwn(body, 'title') && body.title !== '') payload.title = String(body.title).trim()
  if (hasOwn(body, 'category') && body.category !== '') payload.category = String(body.category).trim()
  if (hasOwn(body, 'cuisine')) payload.cuisine = body.cuisine === '' ? null : String(body.cuisine).trim()
  if (hasOwn(body, 'dietaryType') && body.dietaryType !== '') payload.dietaryType = String(body.dietaryType).trim()
  if (hasOwn(body, 'servingSize')) payload.servingSize = body.servingSize === '' ? null : String(body.servingSize).trim()
  if (hasOwn(body, 'difficulty') && body.difficulty !== '') payload.difficulty = String(body.difficulty).trim()
  if (hasOwn(body, 'spiceLevel') && body.spiceLevel !== '') payload.spiceLevel = String(body.spiceLevel).trim()
  if (hasOwn(body, 'servings')) payload.servings = toNumber(body.servings)
  if (hasOwn(body, 'prepTime')) payload.prepTime = toNumber(body.prepTime)
  if (hasOwn(body, 'cookTime')) payload.cookTime = toNumber(body.cookTime)
  if (hasOwn(body, 'totalTime')) payload.totalTime = toNumber(body.totalTime)

  if (hasOwn(body, 'perServing')) {
    const perServing = parseMaybeJson(body.perServing, {})
    payload.perServing = {
      calories: toNumber(perServing?.calories, 0),
      protein: toNumber(perServing?.protein, 0),
      carbs: toNumber(perServing?.carbs, 0),
      fat: toNumber(perServing?.fat, 0),
    }
  }

  if (hasOwn(body, 'ingredients')) {
    const ingredients = parseMaybeJson(body.ingredients, [])
    payload.ingredients = Array.isArray(ingredients) ? ingredients : []
  }

  if (hasOwn(body, 'instructions')) {
    const instructions = parseMaybeJson(body.instructions, [])
    payload.instructions = Array.isArray(instructions) ? instructions : []
  }

  if (hasOwn(body, 'dietaryTags')) {
    payload.dietaryTags = toStringArray(body.dietaryTags)
  }

  if (payload.totalTime === undefined && (hasOwn(body, 'prepTime') || hasOwn(body, 'cookTime'))) {
    const prepTime = payload.prepTime !== undefined ? payload.prepTime : (recipe?.prepTime || 0)
    const cookTime = payload.cookTime !== undefined ? payload.cookTime : (recipe?.cookTime || 0)
    payload.totalTime = prepTime + cookTime
  }

  return payload
}

const buildCreatePayload = (req, imageResult) => {
  const payload = normalizeRecipePayload(req.body)

  return {
    ...payload,
    imageUrl: imageResult.secure_url,
    cloudinaryPublicId: imageResult.public_id,
    createdBy: req.user.uid,
    authorName: req.user.name || 'Anonymous',
    totalTime: payload.totalTime ?? ((payload.prepTime || 0) + (payload.cookTime || 0)),
  }
}

// ── GET /recipes/featured ─────────────────────────────────────────
exports.getFeatured = async (req, res, next) => {
  try {
    const recipes = await Recipe.find({ isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(5)
    res.json({ success: true, data: recipes })
  } catch (err) { next(err) }
}

// ── GET /recipes/traditional ──────────────────────────────────────
exports.getTraditional = async (req, res, next) => {
  try {
    const recipes = await Recipe.find({ cuisine: 'Indian' })
      .sort({ saves: -1 })
      .limit(10)
    res.json({ success: true, data: recipes })
  } catch (err) { next(err) }
}

// ── GET /recipes/quick ────────────────────────────────────────────
exports.getQuickBites = async (req, res, next) => {
  try {
    // totalTime <= 10 minutes
    const recipes = await Recipe.find({ totalTime: { $lte: 10 } })
      .sort({ createdAt: -1 })
      .limit(10)
    res.json({ success: true, data: recipes })
  } catch (err) { next(err) }
}

// ── GET /recipes/search?q=paneer ──────────────────────────────────
exports.search = async (req, res, next) => {
  try {
    const { q } = req.query
    const recipes = await Recipe.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20)
    res.json({ success: true, data: recipes })
  } catch (err) { next(err) }
}

// ── GET /recipes/filter?tag=High Protein ─────────────────────────
exports.filter = async (req, res, next) => {
  try {
    const { tag, dietaryType } = req.query
    const query = {}
    if (tag) query.dietaryTags = tag
    if (dietaryType) query.dietaryType = dietaryType
    const recipes = await Recipe.find(query).sort({ saves: -1 }).limit(20)
    res.json({ success: true, data: recipes })
  } catch (err) { next(err) }
}

// ── GET /recipes/:id ──────────────────────────────────────────────
exports.getById = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) return res.status(404).json({ success: false, message: 'Recipe not found' })
    res.json({ success: true, data: recipe })
  } catch (err) { next(err) }
}

// ── POST /recipes ─────────────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Recipe image is required',
      })
    }

    const imageResult = await uploadImage(req.file.buffer)
    let recipe

    try {
      recipe = await Recipe.create(buildCreatePayload(req, imageResult))
    } catch (error) {
      await deleteImage(imageResult.public_id).catch(() => null)
      throw error
    }

    res.status(201).json({ success: true, data: recipe })
  } catch (err) { next(err) }
}

// ── PUT /recipes/:id ──────────────────────────────────────────────
exports.update = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) return res.status(404).json({ success: false, message: 'Not found' })
    if (recipe.createdBy !== req.user.uid)
      return res.status(403).json({ success: false, message: 'Not your recipe' })

    const payload = normalizeRecipePayload(req.body, recipe)
    let imageCleanupTarget = null
    let newImagePublicId = null

    if (req.file) {
      const imageResult = await uploadImage(req.file.buffer)
      payload.imageUrl = imageResult.secure_url
      payload.cloudinaryPublicId = imageResult.public_id
      newImagePublicId = imageResult.public_id
      imageCleanupTarget = recipe.cloudinaryPublicId
    }

    let updated

    try {
      updated = await Recipe.findByIdAndUpdate(req.params.id, payload, { new: true })
    } catch (error) {
      if (newImagePublicId) {
        await deleteImage(newImagePublicId).catch(() => null)
      }

      throw error
    }

    if (imageCleanupTarget) {
      deleteImage(imageCleanupTarget).catch((error) => {
        console.warn(`Failed to delete old Cloudinary image ${imageCleanupTarget}: ${error.message}`)
      })
    }

    res.json({ success: true, data: updated })
  } catch (err) { next(err) }
}

// ── DELETE /recipes/:id ───────────────────────────────────────────
exports.remove = async (req, res, next) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
    if (!recipe) return res.status(404).json({ success: false, message: 'Not found' })
    if (recipe.createdBy !== req.user.uid)
      return res.status(403).json({ success: false, message: 'Not your recipe' })

    if (recipe.cloudinaryPublicId) {
      await deleteImage(recipe.cloudinaryPublicId)
    }

    await recipe.deleteOne()
    res.json({ success: true, message: 'Recipe deleted' })
  } catch (err) { next(err) }
}

// ── POST /recipes/:id/save ────────────────────────────────────────
exports.saveRecipe = async (req, res, next) => {
  try {
    const { uid } = req.user
    await Recipe.findByIdAndUpdate(req.params.id, {
      $addToSet: { savedBy: uid },
      $inc: { saves: 1 }
    })
    res.json({ success: true, message: 'Recipe saved' })
  } catch (err) { next(err) }
}

// ── POST /recipes/:id/unsave ──────────────────────────────────────
exports.unsaveRecipe = async (req, res, next) => {
  try {
    const { uid } = req.user
    await Recipe.findByIdAndUpdate(req.params.id, {
      $pull: { savedBy: uid },
      $inc: { saves: -1 }
    })
    res.json({ success: true, message: 'Recipe unsaved' })
  } catch (err) { next(err) }
}
