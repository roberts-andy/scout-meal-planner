import 'dotenv/config'
import { initDatabase, create, getAll } from './cosmosdb'

const now = Date.now()

const recipes = [
  {
    id: 'recipe-campfire-chili',
    name: 'Campfire Chili',
    description: 'Hearty chili perfect for cool camping nights. Easy to make in a dutch oven over the fire.',
    servings: 8,
    ingredients: [
      { id: 'ing-1', name: 'Ground beef', quantity: 2, unit: 'lb', category: 'Meat' },
      { id: 'ing-2', name: 'Kidney beans', quantity: 2, unit: 'can', category: 'Canned Goods' },
      { id: 'ing-3', name: 'Diced tomatoes', quantity: 2, unit: 'can', category: 'Canned Goods' },
      { id: 'ing-4', name: 'Onion', quantity: 1, unit: 'whole', category: 'Produce' },
      { id: 'ing-5', name: 'Chili powder', quantity: 3, unit: 'tbsp', category: 'Spices' },
      { id: 'ing-6', name: 'Cumin', quantity: 1, unit: 'tsp', category: 'Spices' },
      { id: 'ing-7', name: 'Salt', quantity: 1, unit: 'tsp', category: 'Spices' },
      { id: 'ing-8', name: 'Shredded cheese', quantity: 1, unit: 'cup', category: 'Dairy' },
    ],
    variations: [
      {
        id: 'var-chili-dutch',
        cookingMethod: 'dutch-oven',
        instructions: [
          'Brown ground beef and onion in dutch oven over coals.',
          'Drain excess fat.',
          'Add beans, tomatoes, chili powder, cumin, and salt.',
          'Stir well and cover.',
          'Cook over medium coals for 30-45 minutes, stirring occasionally.',
          'Top with shredded cheese and serve.',
        ],
        equipment: ['Dutch oven', 'Lid lifter', 'Charcoal briquettes', 'Ladle', 'Can opener'],
        cookingTime: '45 min',
        difficulty: 'easy',
      },
      {
        id: 'var-chili-stove',
        cookingMethod: 'camp-stove',
        instructions: [
          'Brown ground beef and onion in large pot on camp stove.',
          'Drain excess fat.',
          'Add beans, tomatoes, and spices. Stir well.',
          'Bring to a simmer and cook 20-30 minutes.',
          'Top with cheese and serve.',
        ],
        equipment: ['Large pot', 'Camp stove', 'Ladle', 'Can opener'],
        cookingTime: '30 min',
        difficulty: 'easy',
      },
    ],
    tags: ['dinner', 'hearty', 'crowd-pleaser'],
    createdAt: now - 86400000 * 30,
    updatedAt: now - 86400000 * 10,
    currentVersion: 1,
    versions: [
      {
        versionNumber: 1,
        name: 'Campfire Chili',
        description: 'Hearty chili perfect for cool camping nights.',
        servings: 8,
        ingredients: [
          { id: 'ing-1', name: 'Ground beef', quantity: 2, unit: 'lb', category: 'Meat' },
          { id: 'ing-2', name: 'Kidney beans', quantity: 2, unit: 'can', category: 'Canned Goods' },
          { id: 'ing-3', name: 'Diced tomatoes', quantity: 2, unit: 'can', category: 'Canned Goods' },
          { id: 'ing-4', name: 'Onion', quantity: 1, unit: 'whole', category: 'Produce' },
          { id: 'ing-5', name: 'Chili powder', quantity: 3, unit: 'tbsp', category: 'Spices' },
          { id: 'ing-6', name: 'Cumin', quantity: 1, unit: 'tsp', category: 'Spices' },
          { id: 'ing-7', name: 'Salt', quantity: 1, unit: 'tsp', category: 'Spices' },
          { id: 'ing-8', name: 'Shredded cheese', quantity: 1, unit: 'cup', category: 'Dairy' },
        ],
        variations: [],
        tags: ['dinner', 'hearty', 'crowd-pleaser'],
        createdAt: now - 86400000 * 30,
        changeNote: 'Initial version',
      },
    ],
  },
  {
    id: 'recipe-trail-pancakes',
    name: 'Trail Pancakes',
    description: 'Fluffy pancakes that are easy to make at camp. A scout breakfast favorite.',
    servings: 6,
    ingredients: [
      { id: 'ing-10', name: 'Pancake mix', quantity: 2, unit: 'cup', category: 'Dry Goods' },
      { id: 'ing-11', name: 'Water', quantity: 1.5, unit: 'cup', category: 'Other' },
      { id: 'ing-12', name: 'Cooking oil', quantity: 2, unit: 'tbsp', category: 'Cooking' },
      { id: 'ing-13', name: 'Maple syrup', quantity: 1, unit: 'cup', category: 'Condiments' },
      { id: 'ing-14', name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy' },
      { id: 'ing-15', name: 'Blueberries', quantity: 1, unit: 'cup', category: 'Produce', notes: 'optional' },
    ],
    variations: [
      {
        id: 'var-pancake-skillet',
        cookingMethod: 'skillet',
        instructions: [
          'Mix pancake mix with water until just combined (small lumps are OK).',
          'Heat skillet over camp stove on medium heat.',
          'Add a thin layer of oil.',
          'Pour 1/4 cup batter per pancake.',
          'Cook until bubbles form on surface, then flip.',
          'Cook another 1-2 minutes until golden.',
          'Serve with butter and maple syrup.',
        ],
        equipment: ['Skillet', 'Camp stove', 'Spatula', 'Mixing bowl', 'Measuring cups'],
        cookingTime: '20 min',
        difficulty: 'easy',
      },
      {
        id: 'var-pancake-fire',
        cookingMethod: 'open-fire',
        instructions: [
          'Mix pancake mix with water.',
          'Place cast iron skillet on grate over low fire.',
          'Oil the skillet well.',
          'Pour batter and cook until set, flip carefully.',
          'Watch heat — fire cooks unevenly, rotate pan as needed.',
        ],
        equipment: ['Cast iron skillet', 'Fire grate', 'Spatula', 'Mixing bowl'],
        cookingTime: '25 min',
        difficulty: 'medium',
        notes: 'Open fire requires more attention to avoid burning.',
      },
    ],
    tags: ['breakfast', 'easy', 'kid-friendly'],
    createdAt: now - 86400000 * 25,
    updatedAt: now - 86400000 * 5,
    currentVersion: 1,
    versions: [
      {
        versionNumber: 1,
        name: 'Trail Pancakes',
        servings: 6,
        ingredients: [
          { id: 'ing-10', name: 'Pancake mix', quantity: 2, unit: 'cup', category: 'Dry Goods' },
          { id: 'ing-11', name: 'Water', quantity: 1.5, unit: 'cup', category: 'Other' },
          { id: 'ing-12', name: 'Cooking oil', quantity: 2, unit: 'tbsp', category: 'Cooking' },
          { id: 'ing-13', name: 'Maple syrup', quantity: 1, unit: 'cup', category: 'Condiments' },
          { id: 'ing-14', name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy' },
          { id: 'ing-15', name: 'Blueberries', quantity: 1, unit: 'cup', category: 'Produce' },
        ],
        variations: [],
        tags: ['breakfast', 'easy', 'kid-friendly'],
        createdAt: now - 86400000 * 25,
        changeNote: 'Initial version',
      },
    ],
  },
  {
    id: 'recipe-foil-packets',
    name: 'Hobo Foil Packets',
    description: 'Classic foil packet dinner — customize with whatever veggies you have.',
    servings: 8,
    ingredients: [
      { id: 'ing-20', name: 'Ground beef', quantity: 2, unit: 'lb', category: 'Meat' },
      { id: 'ing-21', name: 'Potatoes', quantity: 4, unit: 'whole', category: 'Produce', notes: 'diced' },
      { id: 'ing-22', name: 'Carrots', quantity: 4, unit: 'whole', category: 'Produce', notes: 'sliced' },
      { id: 'ing-23', name: 'Onion', quantity: 2, unit: 'whole', category: 'Produce', notes: 'sliced' },
      { id: 'ing-24', name: 'Aluminum foil', quantity: 1, unit: 'package', category: 'Supplies' },
      { id: 'ing-25', name: 'Salt', quantity: 1, unit: 'to-taste', category: 'Spices' },
      { id: 'ing-26', name: 'Pepper', quantity: 1, unit: 'to-taste', category: 'Spices' },
      { id: 'ing-27', name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy' },
    ],
    variations: [
      {
        id: 'var-foil-fire',
        cookingMethod: 'open-fire',
        instructions: [
          'Divide meat into 8 portions and form into patties.',
          'Place each patty on a large square of heavy-duty foil.',
          'Layer diced potatoes, carrots, and onion on top of each patty.',
          'Add a pat of butter, salt, and pepper.',
          'Fold foil into sealed packets.',
          'Place on hot coals (not in flames) for 20-25 minutes.',
          'Carefully open and check that meat is cooked through.',
        ],
        equipment: ['Heavy-duty aluminum foil', 'Tongs', 'Heat-resistant gloves'],
        cookingTime: '25 min',
        difficulty: 'easy',
      },
      {
        id: 'var-foil-grill',
        cookingMethod: 'grill',
        instructions: [
          'Prepare packets as above.',
          'Place on grill over medium heat.',
          'Cook 20-25 minutes, flipping once halfway.',
          'Check that meat is cooked through before serving.',
        ],
        equipment: ['Grill', 'Heavy-duty aluminum foil', 'Tongs'],
        cookingTime: '25 min',
        difficulty: 'easy',
      },
    ],
    tags: ['dinner', 'easy', 'no-cleanup'],
    createdAt: now - 86400000 * 20,
    updatedAt: now - 86400000 * 3,
    currentVersion: 1,
    versions: [
      {
        versionNumber: 1,
        name: 'Hobo Foil Packets',
        servings: 8,
        ingredients: [
          { id: 'ing-20', name: 'Ground beef', quantity: 2, unit: 'lb', category: 'Meat' },
          { id: 'ing-21', name: 'Potatoes', quantity: 4, unit: 'whole', category: 'Produce' },
          { id: 'ing-22', name: 'Carrots', quantity: 4, unit: 'whole', category: 'Produce' },
          { id: 'ing-23', name: 'Onion', quantity: 2, unit: 'whole', category: 'Produce' },
          { id: 'ing-24', name: 'Aluminum foil', quantity: 1, unit: 'package', category: 'Supplies' },
          { id: 'ing-25', name: 'Salt', quantity: 1, unit: 'to-taste', category: 'Spices' },
          { id: 'ing-26', name: 'Pepper', quantity: 1, unit: 'to-taste', category: 'Spices' },
          { id: 'ing-27', name: 'Butter', quantity: 4, unit: 'tbsp', category: 'Dairy' },
        ],
        variations: [],
        tags: ['dinner', 'easy', 'no-cleanup'],
        createdAt: now - 86400000 * 20,
        changeNote: 'Initial version',
      },
    ],
  },
  {
    id: 'recipe-trail-mix',
    name: 'GORP Trail Mix',
    description: 'Good Old Raisins and Peanuts — the classic hiking snack.',
    servings: 10,
    ingredients: [
      { id: 'ing-30', name: 'Peanuts', quantity: 2, unit: 'cup', category: 'Dry Goods' },
      { id: 'ing-31', name: 'Raisins', quantity: 1, unit: 'cup', category: 'Dry Goods' },
      { id: 'ing-32', name: 'M&Ms', quantity: 1, unit: 'cup', category: 'Dry Goods' },
      { id: 'ing-33', name: 'Pretzels', quantity: 1, unit: 'cup', category: 'Dry Goods' },
      { id: 'ing-34', name: 'Sunflower seeds', quantity: 0.5, unit: 'cup', category: 'Dry Goods' },
    ],
    variations: [
      {
        id: 'var-gorp-nocook',
        cookingMethod: 'no-cook',
        instructions: [
          'Combine all ingredients in a large zip-lock bag.',
          'Shake to mix.',
          'Divide into individual servings.',
        ],
        equipment: ['Large zip-lock bags', 'Small zip-lock bags'],
        cookingTime: '5 min',
        difficulty: 'easy',
      },
    ],
    tags: ['snack', 'no-cook', 'hiking'],
    createdAt: now - 86400000 * 15,
    updatedAt: now - 86400000 * 15,
    currentVersion: 1,
    versions: [
      {
        versionNumber: 1,
        name: 'GORP Trail Mix',
        servings: 10,
        ingredients: [
          { id: 'ing-30', name: 'Peanuts', quantity: 2, unit: 'cup', category: 'Dry Goods' },
          { id: 'ing-31', name: 'Raisins', quantity: 1, unit: 'cup', category: 'Dry Goods' },
          { id: 'ing-32', name: 'M&Ms', quantity: 1, unit: 'cup', category: 'Dry Goods' },
          { id: 'ing-33', name: 'Pretzels', quantity: 1, unit: 'cup', category: 'Dry Goods' },
          { id: 'ing-34', name: 'Sunflower seeds', quantity: 0.5, unit: 'cup', category: 'Dry Goods' },
        ],
        variations: [],
        tags: ['snack', 'no-cook', 'hiking'],
        createdAt: now - 86400000 * 15,
        changeNote: 'Initial version',
      },
    ],
  },
]

const events = [
  {
    id: 'event-spring-campout',
    name: 'Spring Campout 2026',
    startDate: '2026-05-15',
    endDate: '2026-05-17',
    description: 'Annual spring campout at Lake Pinecrest. Two nights of camping with a day hike on Saturday.',
    hike: true,
    tentCamping: true,
    days: [
      {
        date: '2026-05-15',
        meals: [
          { id: 'meal-fri-dinner', type: 'dinner', name: 'Friday Dinner', recipeId: 'recipe-campfire-chili', scoutCount: 12, selectedVariationId: 'var-chili-dutch', time: '18:00' },
        ],
      },
      {
        date: '2026-05-16',
        meals: [
          { id: 'meal-sat-breakfast', type: 'breakfast', name: 'Saturday Breakfast', recipeId: 'recipe-trail-pancakes', scoutCount: 12, selectedVariationId: 'var-pancake-skillet', time: '07:30' },
          { id: 'meal-sat-lunch', type: 'lunch', name: 'Trail Lunch', recipeId: 'recipe-trail-mix', scoutCount: 12, selectedVariationId: 'var-gorp-nocook', time: '12:00', notes: 'Packed lunch for the hike' },
          { id: 'meal-sat-dinner', type: 'dinner', name: 'Saturday Dinner', recipeId: 'recipe-foil-packets', scoutCount: 12, selectedVariationId: 'var-foil-fire', time: '18:00' },
        ],
      },
      {
        date: '2026-05-17',
        meals: [
          { id: 'meal-sun-breakfast', type: 'breakfast', name: 'Sunday Breakfast', recipeId: 'recipe-trail-pancakes', scoutCount: 12, selectedVariationId: 'var-pancake-fire', time: '08:00', notes: 'Let scouts try cooking over fire' },
        ],
      },
    ],
    notes: 'Remember to check weather forecast. Backup plan: move to pavilion if rain.',
    createdAt: now - 86400000 * 14,
    updatedAt: now - 86400000 * 2,
  },
  {
    id: 'event-summer-camp',
    name: 'Summer Camp Week',
    startDate: '2026-07-06',
    endDate: '2026-07-10',
    description: 'Week-long summer camp at Camp Winton. Cabin camping with mess hall access.',
    cabinCamping: true,
    days: [
      {
        date: '2026-07-06',
        meals: [
          { id: 'meal-mon-dinner', type: 'dinner', name: 'Arrival Dinner', recipeId: 'recipe-campfire-chili', scoutCount: 20, selectedVariationId: 'var-chili-stove', time: '18:30' },
        ],
      },
      {
        date: '2026-07-07',
        meals: [
          { id: 'meal-tue-breakfast', type: 'breakfast', name: 'Tuesday Breakfast', recipeId: 'recipe-trail-pancakes', scoutCount: 20, selectedVariationId: 'var-pancake-skillet', time: '07:00' },
          { id: 'meal-tue-snack', type: 'snack', name: 'Afternoon Snack', recipeId: 'recipe-trail-mix', scoutCount: 20, selectedVariationId: 'var-gorp-nocook', time: '15:00' },
          { id: 'meal-tue-dinner', type: 'dinner', name: 'Tuesday Dinner', recipeId: 'recipe-foil-packets', scoutCount: 20, selectedVariationId: 'var-foil-grill', time: '18:00' },
        ],
      },
    ],
    notes: 'Coordinate with camp kitchen for lunch meals. We only need to plan breakfast, dinner, and snacks.',
    createdAt: now - 86400000 * 7,
    updatedAt: now - 86400000 * 1,
  },
]

async function seed() {
  console.log('Initializing database...')
  await initDatabase()

  const existingRecipes = await getAll('recipes')
  const existingEvents = await getAll('events')

  if (existingRecipes.length > 0 || existingEvents.length > 0) {
    console.log(`Database already has data (${existingRecipes.length} recipes, ${existingEvents.length} events). Skipping seed.`)
    console.log('To re-seed, delete the database in the emulator first.')
    return
  }

  console.log('Seeding recipes...')
  for (const recipe of recipes) {
    await create('recipes', recipe)
    console.log(`  + ${recipe.name}`)
  }

  console.log('Seeding events...')
  for (const event of events) {
    await create('events', event)
    console.log(`  + ${event.name}`)
  }

  console.log(`\nDone! Seeded ${recipes.length} recipes and ${events.length} events.`)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
