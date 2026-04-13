# Testing Recipe Version Updates on Active Trips

This document provides a comprehensive testing guide for validating that recipe version management works correctly when editing recipes on active trips.

## Feature Overview

The app implements a sophisticated recipe versioning system:
- When a recipe is added to a trip, **no new version is created**
- When a recipe is edited **during an active trip**, a **new version is created for that trip**
- **Multiple edits during the same trip update the same version** (not creating additional versions)
- Once a trip **ends** (past the end date), **edits are locked** for that trip's version
- Each trip gets **its own version** of the recipe if edited

## Test Scenarios

### Test 1: Add Recipe to Active Trip (No Version Created)

**Setup:**
1. Navigate to the Recipes tab
2. Create a new recipe:
   - Name: "Campfire Pancakes"
   - Servings: 4
   - Add ingredients:
     - 2 cups flour
     - 2 tbsp sugar
     - 1 tsp salt
   - Add a camp-stove variation with basic instructions
3. Create a new event:
   - Name: "Summer Camp 2024"
   - Start Date: Today
   - End Date: 3 days from today

**Test Steps:**
1. Go to the "Summer Camp 2024" event
2. Click "Add Meal" on Day 1
3. Select "Breakfast" meal type
4. Select "Campfire Pancakes" from the recipe dropdown
5. Set scout count to 8
6. Click "Add Meal"

**Expected Results:**
- ✅ The recipe is added to the meal
- ✅ Recipe shows in the schedule with 8 scouts
- ✅ No new version is created (recipe should still show version 1)
- ✅ Recipe versions array should be empty `[]`

**Verification:**
- Click on the Recipes tab
- Find "Campfire Pancakes"
- Click "View History" (if available)
- Confirm: Current Version = 1, Versions list = empty

---

### Test 2: Edit Recipe During Active Trip (Creates New Version)

**Setup:**
Continue from Test 1 with "Campfire Pancakes" assigned to "Summer Camp 2024"

**Test Steps:**
1. Navigate back to "Summer Camp 2024" event
2. Go to the Schedule tab
3. Find the "Campfire Pancakes" meal on Day 1
4. Click "Edit Recipe" button
5. Make changes:
   - Add ingredient: 2 cups milk
   - Change servings to 6
   - Update instructions
6. (Optional) Add a change note: "Added milk for better texture"
7. Click "Save"

**Expected Results:**
- ✅ Recipe is updated with new ingredients
- ✅ A new version 2 is created
- ✅ Version 2 is tagged with the event ID and event name ("Summer Camp 2024")
- ✅ The versions array contains one entry for version 2
- ✅ Current version is now 2
- ✅ Shopping list and equipment lists update to reflect changes

**Verification:**
1. Go to Recipes tab
2. Find "Campfire Pancakes" and view version history
3. Confirm:
   - Current Version = 2
   - Version 2 has badge "Summer Camp 2024"
   - Version 2 shows the milk ingredient
   - Version history shows the change note

---

### Test 3: Multiple Edits on Same Trip (Updates Same Version)

**Setup:**
Continue from Test 2 with version 2 created for "Summer Camp 2024"

**Test Steps:**
1. Navigate back to "Summer Camp 2024" event
2. Find "Campfire Pancakes" meal again
3. Click "Edit Recipe"
4. Make additional changes:
   - Add ingredient: 2 eggs
   - Change a cooking instruction
5. Click "Save"
6. Repeat: Edit recipe again
   - Add ingredient: 1 tsp baking powder
   - Click "Save"

**Expected Results:**
- ✅ Recipe updates with eggs and baking powder
- ✅ Still on version 2 (no version 3 created)
- ✅ Version 2's timestamp updates to latest edit time
- ✅ All changes accumulate in version 2
- ✅ Versions array still has only one entry (version 2 for Summer Camp)

**Verification:**
1. View recipe version history
2. Confirm:
   - Current Version = 2 (not 3 or 4)
   - Only one version in history (version 2)
   - Version 2 contains eggs AND baking powder
   - Version 2 still tagged with "Summer Camp 2024"

---

### Test 4: Edit Same Recipe on Different Trip (Creates New Version)

**Setup:**
Continue from Test 3. "Campfire Pancakes" is at version 2 from Summer Camp edits.

**Test Steps:**
1. Create a second event:
   - Name: "Fall Campout"
   - Start Date: Tomorrow
   - End Date: 2 days from tomorrow
2. Add "Campfire Pancakes" to Fall Campout on Day 1 breakfast
3. Edit the recipe from Fall Campout:
   - Change servings to 10
   - Add ingredient: 1 tbsp vanilla extract
4. Click "Save"

**Expected Results:**
- ✅ A new version 3 is created
- ✅ Version 3 is tagged with "Fall Campout" event
- ✅ Version 2 still exists tagged with "Summer Camp 2024"
- ✅ Versions array now has two entries: version 2 and version 3
- ✅ Each event sees its own version when viewed

**Verification:**
1. View recipe version history
2. Confirm:
   - Current Version = 3
   - Version history shows:
     - Version 3: Tagged "Fall Campout", has vanilla extract
     - Version 2: Tagged "Summer Camp 2024", has eggs and baking powder
   - Both versions preserved independently

---

### Test 5: Editing After Trip Ends (Locked)

**Setup:**
We need a trip that has already ended.

**Test Steps:**
1. Create a new event:
   - Name: "Past Trip"
   - Start Date: 5 days ago
   - End Date: 3 days ago (in the past)
2. Add "Campfire Pancakes" to this past trip
3. Navigate to the "Past Trip" event
4. Find "Campfire Pancakes" in the schedule
5. Try to click "Edit Recipe"

**Expected Results:**
- ✅ The "Edit Recipe" button shows a lock icon
- ✅ The "Edit Recipe" button is disabled
- ✅ If clicked, a toast notification appears:
  - Title: "Cannot edit recipe"
  - Description: "This event has ended. Recipe changes are locked."
- ✅ No dialog opens
- ✅ Recipe cannot be modified for this past event

**Verification:**
1. Confirm lock icon is visible on the button
2. Confirm button is visually disabled (grayed out)
3. Confirm no edits are possible

---

### Test 6: Recipe History Display

**Setup:**
Continue with "Campfire Pancakes" which should now have multiple versions

**Test Steps:**
1. Go to Recipes tab
2. Find "Campfire Pancakes"
3. Click a button or link to view version history (may need to add this UI)

**Expected Results:**
The version history dialog/view should show:
- ✅ Current version at the top with "Current" badge
- ✅ All historical versions listed in reverse chronological order
- ✅ Each version shows:
  - Version number
  - Event badge (if from a trip)
  - Timestamp
  - Change note (if provided)
  - Servings count
  - Expandable details showing ingredients and variations
- ✅ Versions can be expanded to see full recipe details at that point in time

**Verification:**
Review the version history matches this pattern:
```
Version 3 [Current] [Fall Campout Badge]
  - Shows vanilla extract
  - 10 servings

Version 2 [Summer Camp 2024 Badge]
  - Shows eggs, baking powder, milk
  - 6 servings

(No Version 1 shown as it was the original and wasn't saved as a version)
```

---

## Data Structure Validation

### Check Recipe Object in Browser DevTools

After running the tests, inspect the recipe data structure:

1. Open browser DevTools (F12)
2. Go to Application/Storage tab
3. Find the key-value storage for recipes (`scout-recipes`)
4. Find "Campfire Pancakes" recipe

**Expected Structure:**
```typescript
{
  id: "recipe-[timestamp]",
  name: "Campfire Pancakes",
  description: "...",
  servings: 10, // current version servings
  ingredients: [...], // current version ingredients
  variations: [...], // current version variations
  currentVersion: 3,
  versions: [
    {
      versionNumber: 2,
      eventId: "event-[id]",
      eventName: "Summer Camp 2024",
      name: "Campfire Pancakes",
      servings: 6,
      ingredients: [...], // snapshot at version 2
      variations: [...],
      createdAt: [timestamp],
      changeNote: "Added milk for better texture"
    },
    {
      versionNumber: 3,
      eventId: "event-[id2]",
      eventName: "Fall Campout",
      name: "Campfire Pancakes",
      servings: 10,
      ingredients: [...], // snapshot at version 3
      variations: [...],
      createdAt: [timestamp],
      changeNote: "Modified for Fall Campout"
    }
  ],
  createdAt: [original timestamp],
  updatedAt: [latest edit timestamp]
}
```

---

## Edge Cases to Test

### Edge Case 1: Edit Recipe Outside of Trip Context
**Test:** Edit "Campfire Pancakes" from the Recipes tab (not within an event)
**Expected:** Creates a new version without event tagging

### Edge Case 2: Clone Recipe Then Edit on Trip
**Test:** Clone a recipe, add to trip, edit the clone
**Expected:** Version created for the cloned recipe, original unaffected

### Edge Case 3: Delete Meal with Edited Recipe
**Test:** Delete a meal that uses a recipe with a trip-specific version
**Expected:** Version remains in history (not deleted with meal)

### Edge Case 4: View Recipe from Different Trips
**Test:** Add same recipe to multiple trips, verify each trip can edit independently
**Expected:** Each trip creates its own version; changes don't affect other trips' versions

---

## Success Criteria Summary

The versioning system is working correctly if:

1. ✅ Adding a recipe to a trip does NOT create a version
2. ✅ First edit on a trip CREATES a new version tagged to that trip
3. ✅ Multiple edits on the same trip UPDATE the same version
4. ✅ Editing on different trips creates SEPARATE versions per trip
5. ✅ Past trips LOCK editing with clear user feedback
6. ✅ Version history displays all versions with trip associations
7. ✅ Current recipe data always reflects latest changes
8. ✅ Historical versions preserve exact snapshot from that time
9. ✅ Shopping lists and equipment lists use current version data
10. ✅ Version numbers increment sequentially across all edits

---

## Known Issues to Watch For

- Version numbers skipping (indicates extra versions being created)
- Multiple versions for same trip (should only be one per trip)
- Versions not tagged with event name/ID
- Lock not working on past events
- Version history not displaying
- Shopping list using wrong recipe version
- Changes not persisting between page refreshes
- Race conditions when editing quickly

---

## How to Access Version History in the UI

1. **From Recipe Library:**
   - Go to the "Recipes" tab
   - Click on any recipe card to open the detail dialog
   - If the recipe has version history, you'll see a "History" button in the top-right of the dialog
   - Click "History" to view all versions with full details

2. **Version History Features:**
   - Current version is highlighted at the top with a "Current" badge
   - Trip-specific versions show the event name in a badge
   - Each version can be expanded to see full ingredient lists and cooking variations
   - Timestamps show when each version was created
   - Change notes (if provided) are displayed for each version

## Testing Tools

**Browser DevTools Console Commands:**

```javascript
// View all recipes
await spark.kv.get('scout-recipes')

// View all events
await spark.kv.get('scout-events')

// View specific recipe versions
const recipes = await spark.kv.get('scout-recipes')
const pancakes = recipes.find(r => r.name === 'Campfire Pancakes')
console.log('Current Version:', pancakes.currentVersion)
console.log('Version History:', pancakes.versions)

// Check if event is active
const events = await spark.kv.get('scout-events')
const event = events[0]
const isActive = new Date() <= new Date(event.endDate)
console.log('Event Active:', isActive)

// Detailed version inspection
const recipes = await spark.kv.get('scout-recipes')
const recipe = recipes.find(r => r.name === 'Campfire Pancakes')
console.table(recipe.versions.map(v => ({
  version: v.versionNumber,
  event: v.eventName || 'N/A',
  servings: v.servings,
  ingredients: v.ingredients.length,
  timestamp: new Date(v.createdAt).toLocaleString()
})))

// Reset all data (use with caution!)
await spark.kv.delete('scout-recipes')
await spark.kv.delete('scout-events')
await spark.kv.delete('scout-feedback')
```

---

## Reporting Issues

When reporting issues with versioning, include:

1. Recipe name and ID
2. Event name and date range
3. Expected version number vs. actual
4. Screenshot of version history
5. Console output from testing tools above
6. Steps to reproduce
7. Browser and environment details
