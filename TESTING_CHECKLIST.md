# Quick Testing Checklist for Recipe Versioning

Print this checklist and check off each item as you test.

## Setup
- [ ] App is running and accessible
- [ ] Browser DevTools are open (F12) for inspection
- [ ] Created test recipe: "Campfire Pancakes" with basic ingredients

## Test 1: Add to Active Trip (No Version)
- [ ] Created "Summer Camp 2024" event (starts today, ends in 3 days)
- [ ] Added "Campfire Pancakes" to Day 1 breakfast
- [ ] Recipe shows in schedule
- [ ] Recipe still at version 1
- [ ] Recipe versions array is empty `[]`

## Test 2: Edit During Trip (Creates Version)
- [ ] Clicked "Edit Recipe" from Summer Camp schedule
- [ ] Added milk to ingredients
- [ ] Changed servings
- [ ] Saved changes
- [ ] Recipe now at version 2
- [ ] Version 2 tagged with "Summer Camp 2024"
- [ ] Version history accessible via recipe detail

## Test 3: Multiple Edits Same Trip (Updates Version)
- [ ] Edited recipe again from Summer Camp
- [ ] Added eggs
- [ ] Saved
- [ ] Edited again from Summer Camp
- [ ] Added baking powder
- [ ] Saved
- [ ] Still at version 2 (not version 3 or 4)
- [ ] Version 2 contains all changes (milk, eggs, baking powder)

## Test 4: Different Trip (New Version)
- [ ] Created "Fall Campout" event (starts tomorrow)
- [ ] Added "Campfire Pancakes" to Fall Campout
- [ ] Edited recipe from Fall Campout
- [ ] Added vanilla extract
- [ ] Saved changes
- [ ] Now at version 3
- [ ] Version 3 tagged with "Fall Campout"
- [ ] Version 2 still exists with "Summer Camp 2024" tag
- [ ] Both versions preserved independently

## Test 5: Past Event Lock
- [ ] Created "Past Trip" (ended 3 days ago)
- [ ] Added "Campfire Pancakes" to Past Trip
- [ ] "Edit Recipe" button shows lock icon
- [ ] "Edit Recipe" button is disabled
- [ ] Clicking shows "Cannot edit" toast message
- [ ] No editing possible

## Test 6: Version History UI
- [ ] Opened recipe detail dialog
- [ ] "History" button visible (if versions exist)
- [ ] Version history dialog shows all versions
- [ ] Current version at top with badge
- [ ] Event badges show on trip versions
- [ ] Timestamps displayed correctly
- [ ] Can expand versions to see details
- [ ] Ingredients/variations show for each version

## Data Validation (DevTools)
- [ ] Opened browser console
- [ ] Ran: `await spark.kv.get('scout-recipes')`
- [ ] Found "Campfire Pancakes" in output
- [ ] Verified `currentVersion` matches expected
- [ ] Verified `versions` array has correct entries
- [ ] Each version has `eventId` and `eventName`
- [ ] Version numbers are sequential

## Shopping List Integration
- [ ] Opened "Summer Camp 2024" shopping list
- [ ] Shopping list uses current recipe version
- [ ] All current ingredients appear
- [ ] Quantities scaled correctly for scout count

## UI/UX Verification
- [ ] Version badges show on recipe cards
- [ ] "Edit Recipe" has smooth transitions
- [ ] Version history dialog is readable
- [ ] Event badges use distinct styling
- [ ] Lock icon is clear and visible
- [ ] Toast notifications work properly

## Edge Cases
- [ ] Edited recipe outside trip context (from Recipes tab)
- [ ] Version created without event tagging
- [ ] Deleted meal with versioned recipe (version persists)
- [ ] Cloned recipe works independently

## Issues Found
Document any issues here:

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________
4. _______________________________________________
5. _______________________________________________

## Final Verification
- [ ] All 10 success criteria met (see main testing doc)
- [ ] No console errors during testing
- [ ] Data persists after page refresh
- [ ] Version numbers increment correctly
- [ ] No duplicate versions for same trip

## Test Completion
- Date: _______________
- Tester: _______________
- Result: PASS / FAIL (circle one)
- Notes: _______________________________________________
