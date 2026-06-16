const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Food = require('../models/Food');

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Helper: clean number values ─────────────────────────────
const toNumber = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

// ─── Helper: auto-generate tags from category ─────────────────
const generateTags = (category = '') => {
  const cat = category.toLowerCase();
  const tags = [];

  if (cat.includes('fruit') || cat.includes('apple') || cat.includes('mango')) {
    tags.push('fruit', 'vegan', 'vegetarian');
  }
  if (cat.includes('vegetable') || cat.includes('veggie')) {
    tags.push('vegetable', 'vegan', 'vegetarian');
  }
  if (cat.includes('meat') || cat.includes('chicken') || cat.includes('mutton') || cat.includes('fish')) {
    tags.push('non-vegetarian', 'high-protein');
  }
  if (cat.includes('dal') || cat.includes('lentil') || cat.includes('bean')) {
    tags.push('vegetarian', 'vegan', 'high-protein');
  }
  if (cat.includes('dairy') || cat.includes('milk') || cat.includes('cheese')) {
    tags.push('vegetarian', 'dairy');
  }
  if (cat.includes('sweet') || cat.includes('dessert') || cat.includes('cake')) {
    tags.push('sweet', 'vegetarian');
  }
  if (cat.includes('drink') || cat.includes('beverage') || cat.includes('juice')) {
    tags.push('beverage');
  }
  if (cat.includes('snack') || cat.includes('fried')) {
    tags.push('snack');
  }
  if (tags.length === 0) tags.push('other');

  // Remove duplicates
  return [...new Set(tags)];
};

// ─── Main seeder ──────────────────────────────────────────────
const seed = async () => {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'calorietrack',
    });
    console.log('✅ MongoDB Connected');

    // 2. Clear existing data
    await Food.deleteMany({});
    console.log('🗑️  Cleared existing food data');

    // 3. Read and parse CSV
    const foods = [];
    const csvPath = path.resolve(__dirname, 'indian_food.csv');

    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // Skip rows with no name or calories
          if (!row.food_name || !row.calories) return;

          foods.push({
            name: row.food_name.trim(),
            category: row.category ? row.category.trim() : 'Other',
            per100g: {
              calories:  toNumber(row.calories),
              protein:   toNumber(row.protein),
              carbs:     toNumber(row.carbs),
              fat:       toNumber(row.fat),
              iron:      toNumber(row.iron),
              vitamin_c: toNumber(row.vitamin_c),
            },
            tags: generateTags(row.category),
            source: 'kaggle',
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📦 Parsed ${foods.length} foods from CSV`);

    // 4. Insert in batches of 100 (safe for Atlas free tier)
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < foods.length; i += batchSize) {
      const batch = foods.slice(i, i + batchSize);
      await Food.insertMany(batch, { ordered: false });
      inserted += batch.length;
      console.log(`⏳ Inserted ${inserted}/${foods.length} foods...`);
    }

    console.log(`\n🌱 Seeding complete! ${inserted} Indian foods added to MongoDB.`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeder failed:', error.message);
    process.exit(1);
  }
};

seed();