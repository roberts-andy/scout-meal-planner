# Recipe Versioning Test Suite

This directory contains comprehensive testing documentation for validating the recipe versioning feature on active trips.

## 📚 Testing Documents

### 1. TESTING_RECIPE_VERSIONS.md
**Comprehensive Testing Guide**

The main testing document with:
- Feature overview and requirements
- 6 detailed test scenarios with step-by-step instructions
- Expected results for each test
- Data structure validation examples
- Edge cases to verify
- Browser console commands for debugging
- Success criteria checklist

**Use this for:** Understanding how versioning works and performing thorough testing.

### 2. TESTING_CHECKLIST.md
**Quick Testing Checklist**

A printable checklist format with:
- Simple checkboxes for each test step
- All 6 test scenarios in abbreviated form
- UI/UX verification items
- Space to document issues
- Final sign-off section

**Use this for:** Quick testing sessions and tracking completion.

## 🎯 What is Recipe Versioning?

The Scout Meal Planner implements intelligent recipe versioning:

1. **Adding recipe to trip:** No version created
2. **First edit during trip:** Creates version tagged to that trip
3. **Multiple edits on same trip:** Updates the same version
4. **Different trip edits:** Creates separate version per trip
5. **Past trips:** Locked from editing

### Example Flow:
```
Recipe: "Campfire Pancakes" v1
  ↓
Add to "Summer Camp" → No new version created
  ↓
Edit on "Summer Camp" → v2 created (tagged "Summer Camp")
  ↓
Edit again on "Summer Camp" → v2 updated (not v3)
  ↓
Add to "Fall Campout" → No new version
  ↓
Edit on "Fall Campout" → v3 created (tagged "Fall Campout")
  ↓
"Summer Camp" ends → v2 locked from further edits
```

## 🚀 Quick Start Testing

### Prerequisites
- App is running
- Browser DevTools available (F12)
- Fresh browser session recommended

### Recommended Testing Order

1. **First Time Testers:**
   - Read TESTING_RECIPE_VERSIONS.md sections: "Feature Overview" and "Test 1"
   - Perform Test 1 following detailed steps
   - Verify results using browser console commands
   - Continue through Tests 2-6

2. **Experienced Testers:**
   - Use TESTING_CHECKLIST.md
   - Check off items as you complete them
   - Reference main doc for details if needed

3. **Bug Verification:**
   - Use specific test scenario that reproduces issue
   - Follow console commands to inspect data
   - Document findings in checklist "Issues Found" section

## 🔍 How to Access Version History in the App

1. Go to **Recipes** tab
2. Click any recipe card
3. Click **"History"** button (if recipe has versions)
4. View all versions with expandable details

## 🛠️ Browser Console Commands

Quick reference for debugging:

```javascript
// View all recipes
const recipes = await spark.kv.get('scout-recipes')

// Find specific recipe
const recipe = recipes.find(r => r.name === 'Campfire Pancakes')

// Check version info
console.log('Current Version:', recipe.currentVersion)
console.log('Versions:', recipe.versions)

// Pretty table of versions
console.table(recipe.versions.map(v => ({
  version: v.versionNumber,
  event: v.eventName || 'N/A',
  servings: v.servings,
  date: new Date(v.createdAt).toLocaleString()
})))

// Check event status
const events = await spark.kv.get('scout-events')
const event = events[0]
console.log('Event active?', new Date() <= new Date(event.endDate))

// Reset data (careful!)
await spark.kv.delete('scout-recipes')
await spark.kv.delete('scout-events')
```

## ✅ Success Criteria

The versioning system is working correctly when:

1. ✅ Adding recipe to trip does NOT create version
2. ✅ First edit on trip CREATES version tagged to trip
3. ✅ Multiple edits on same trip UPDATE same version
4. ✅ Different trips create SEPARATE versions
5. ✅ Past trips LOCK editing with clear feedback
6. ✅ Version history displays all versions correctly
7. ✅ Current data reflects latest changes
8. ✅ Historical snapshots preserved
9. ✅ Shopping lists use current version
10. ✅ Version numbers increment sequentially

## 🐛 Common Issues to Watch For

- ❌ Version numbers skipping (extra versions created)
- ❌ Multiple versions for same trip
- ❌ Versions not tagged with event info
- ❌ Lock not working on past events
- ❌ Changes not persisting
- ❌ Version history not displaying

## 📝 Reporting Issues

When reporting bugs, include:

1. Recipe name and ID
2. Event name and dates
3. Expected vs actual version number
4. Screenshot of version history
5. Console output from debug commands
6. Steps to reproduce
7. Browser details

## 🔄 Test Data Reset

To start fresh:

```javascript
// In browser console
await spark.kv.delete('scout-recipes')
await spark.kv.delete('scout-events')
await spark.kv.delete('scout-feedback')
```

Then refresh the page.

## 📞 Support

For questions about the versioning feature:
- Review PRD.md for design decisions
- Check TESTING_RECIPE_VERSIONS.md for detailed explanations
- Inspect code in:
  - `src/components/EventSchedule.tsx` (edit trigger)
  - `src/components/CreateRecipeDialog.tsx` (version logic)
  - `src/components/RecipeVersionHistory.tsx` (display)
  - `src/lib/helpers.ts` (helper functions)

---

**Happy Testing! 🏕️**
