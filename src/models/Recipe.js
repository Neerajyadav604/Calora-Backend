const mongoose = require('mongoose')

const RecipeSchema = new mongoose.Schema({

  // Basic Info
  title: { type: String, required: true },
  category: { type: String, required: true }, // Breakfast, Lunch, Dinner, Snack
  cuisine: { type: String },
  dietaryType: { type: String, enum: ['veg', 'non-veg', 'vegan'], required: true },

  // Author (from Firebase)
  createdBy: { type: String, required: true }, // Firebase UID
  authorName: { type: String },

  // Image uploaded to Cloudinary
  imageUrl: { type: String, default: null },
  cloudinaryPublicId: { type: String, default: null },

  // Nutrition (user fills manually)
  perServing: {
    calories: { type: Number, default: 0 },
    protein:  { type: Number, default: 0 },
    carbs:    { type: Number, default: 0 },
    fat:      { type: Number, default: 0 }
  },
  servingSize: { type: String },  // e.g. "250g"
  servings: { type: Number, default: 1 },

  // Time & Difficulty
  prepTime:   { type: Number }, // minutes
  cookTime:   { type: Number },
  totalTime:  { type: Number },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  spiceLevel: { type: String, enum: ['No Spice', 'Mild', 'Medium', 'Hot'] },

  // Ingredients & Steps
  ingredients:  [{ name: String }],
  instructions: [{ step: Number, text: String }],

  // Tags
  dietaryTags: [String], // ['High Protein', 'Low Carb', 'Keto', 'Gluten Free', 'Dairy Free']

  // Community
  saves:   { type: Number, default: 0 },
  savedBy: [String], // Firebase UIDs

  // Featured (set by admin manually in DB)
  isFeatured:  { type: Boolean, default: false },
  isTopChoice: { type: Boolean, default: false },

}, { timestamps: true })

RecipeSchema.index({ title: 'text', cuisine: 'text', dietaryTags: 'text' })

module.exports = mongoose.model('Recipe', RecipeSchema)
