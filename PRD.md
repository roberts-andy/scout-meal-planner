# Planning Guide

A comprehensive meal planning application for scout troops to plan, organize, and manage meals for camping trips and events, with recipe management, equipment tracking, shopping lists, and feedback collection.

**Experience Qualities**:
1. **Organized** - Clear structure for managing multiple meals across multi-day events with all details in one place
2. **Practical** - Field-ready interface that scouts can use while planning and during trips, with quick access to recipes and lists
3. **Collaborative** - Easy feedback collection and recipe refinement based on real camping experiences

**Complexity Level**: Complex Application (advanced functionality, likely with multiple views)
This app requires multiple interconnected features: event planning, recipe management with variations, dynamic scaling, equipment tracking, shopping list generation, and feedback systems. It needs sophisticated state management and multiple coordinated views.

## Essential Features

### Event & Meal Schedule Management
- **Functionality**: Create events with date ranges and define which meals are needed on each day (breakfast, lunch, dinner, snacks)
- **Purpose**: Provides structure for organizing all meals across a multi-day trip
- **Trigger**: User clicks "New Event" or "Add Meal" within an event
- **Progression**: Create event with name/dates → Select days → Add meals to specific days → Assign recipes to meals → View complete schedule
- **Success criteria**: Events display all days with assigned meals in chronological order; meals can be added/removed easily

### Recipe Management with Variations
- **Functionality**: Create recipes with ingredients, instructions, and multiple cooking method variations (open fire, camp stove, skillet, Dutch oven, etc.)
- **Purpose**: Maintains a library of scout-tested recipes adaptable to different camping scenarios
- **Trigger**: User clicks "Add Recipe" or "Add Variation" to existing recipe
- **Progression**: Enter recipe name → Add base ingredients with quantities → Enter instructions → Create cooking method variations → Save to library
- **Success criteria**: Recipes store multiple variations; each variation maintains its own instructions and equipment needs

### Dynamic Recipe Scaling
- **Functionality**: Automatically scale ingredient quantities based on number of scouts attending the meal
- **Purpose**: Ensures correct portions without manual calculation errors
- **Trigger**: User enters number of scouts for a meal or adjusts the count
- **Progression**: Enter scout count → System calculates scaled quantities → Display updated ingredient amounts → Update shopping list automatically
- **Success criteria**: All ingredient quantities scale proportionally; fractions display in practical cooking measurements

### Equipment Tracking
- **Functionality**: Track required cooking equipment per recipe variation and compile comprehensive equipment list for the event
- **Purpose**: Ensures scouts bring all necessary gear and prevents forgotten equipment
- **Trigger**: User adds equipment to recipe variation or views event equipment list
- **Progression**: Add equipment items to recipe variation → View compiled list for event → Check off items when packing → See equipment organized by recipe
- **Success criteria**: Equipment list aggregates all items needed; duplicates are consolidated with quantities

### Shopping List Generation
- **Functionality**: Automatically generate consolidated shopping list from all event meals with scaled quantities
- **Purpose**: Simplifies procurement and ensures nothing is forgotten
- **Trigger**: User views shopping list for an event
- **Progression**: Select event → View shopping list → See all ingredients consolidated and scaled → Check off items when purchased → Organize by category
- **Success criteria**: Ingredients from multiple recipes combine correctly; quantities sum appropriately; list is printable/exportable

### Custom Instructions & Notes
- **Functionality**: Add free-form notes and special instructions to events, meals, or recipes
- **Purpose**: Captures important context, timing considerations, or special requirements
- **Trigger**: User clicks "Add Note" on any relevant screen
- **Progression**: Click add note → Enter text → Save → Display with associated item → Edit or delete as needed
- **Success criteria**: Notes persist with their associated items; display prominently when relevant

### Scout Feedback System
- **Functionality**: Collect structured and free-form feedback on meals after events
- **Purpose**: Continuous improvement of recipes based on real scout experiences
- **Trigger**: After event completion, scouts submit feedback on meals
- **Progression**: Open completed event → Select meal → Rate aspects (taste, difficulty, portion size) → Add comments → View feedback history on recipes
- **Success criteria**: Feedback is tied to specific meals/recipes; history is visible when planning future events; multiple scouts can provide feedback

## Edge Case Handling

- **Empty States**: Clear prompts guide users to create their first event, recipe, or meal with helpful onboarding
- **Zero Scouts**: Prevent scaling to zero; require at least 1 scout for meal planning
- **Missing Recipe Data**: Allow meals without assigned recipes; display warnings for incomplete planning
- **Fractional Quantities**: Round scaled ingredients to practical measurements (⅓ cup instead of 0.33 cups)
- **Duplicate Ingredients**: Intelligently combine ingredients across recipes in shopping lists (handle different units)
- **No Internet**: App works offline with all data persisted locally; no external API dependencies
- **Long Lists**: Implement search, filtering, and categorization for recipe library and shopping lists

## Design Direction

The design should evoke a sense of outdoor adventure combined with practical organization. It should feel like a well-organized field guide—purposeful, rugged, and reliable. The interface should be easy to use in various lighting conditions and feel dependable, like trusted camping gear.

## Color Selection

**Approach**: An earthy, outdoor-inspired palette with warm accent colors that evoke campfires and nature. High contrast for outdoor readability.

- **Primary Color**: Deep Forest Green (oklch(0.45 0.09 155)) - Represents nature, scouting, and the outdoors; trustworthy and grounding
- **Secondary Colors**: 
  - Warm Stone Gray (oklch(0.70 0.01 85)) - Neutral supporting color for secondary UI elements
  - Deep Earth Brown (oklch(0.35 0.04 60)) - Adds warmth and outdoor character
- **Accent Color**: Campfire Orange (oklch(0.68 0.18 50)) - Energetic and attention-grabbing for CTAs and important actions; evokes warmth of gathering around a campfire
- **Foreground/Background Pairings**:
  - Background White (oklch(0.98 0 0)): Dark Charcoal text (oklch(0.25 0 0)) - Ratio 12.3:1 ✓
  - Primary Forest Green (oklch(0.45 0.09 155)): White text (oklch(0.98 0 0)) - Ratio 6.8:1 ✓
  - Accent Campfire Orange (oklch(0.68 0.18 50)): Dark Charcoal text (oklch(0.25 0 0)) - Ratio 5.2:1 ✓
  - Secondary Stone Gray (oklch(0.70 0.01 85)): Dark Charcoal text (oklch(0.25 0 0)) - Ratio 4.9:1 ✓

## Font Selection

Typography should be clear, readable outdoors, and feel organized like a field manual while maintaining a friendly, accessible character suitable for scouts of various ages.

- **Typographic Hierarchy**:
  - H1 (App Title/Event Names): Space Grotesk Bold / 32px / -0.02em letter spacing / line-height 1.2
  - H2 (Section Headers): Space Grotesk Semibold / 24px / -0.01em letter spacing / line-height 1.3
  - H3 (Card Titles/Recipe Names): Space Grotesk Medium / 18px / normal spacing / line-height 1.4
  - Body (Instructions/Lists): Source Sans 3 Regular / 16px / normal spacing / line-height 1.6
  - Small (Labels/Meta): Source Sans 3 Medium / 14px / normal spacing / line-height 1.5
  - Captions (Counts/Timestamps): Source Sans 3 Regular / 13px / normal spacing / line-height 1.4

## Animations

Animations should feel purposeful and efficient, like the smooth operation of quality camping equipment. Use subtle motion to guide attention and confirm actions without slowing down the planning workflow.

- **List reordering**: Smooth spring-based transitions when adding/removing meals or ingredients
- **Recipe scaling**: Brief number animations when quantities update, drawing attention to changes
- **Checklist interactions**: Satisfying check-off animations for shopping lists and equipment
- **Card expansion**: Fluid accordion-style opening for recipe details and variations
- **Tab transitions**: Quick slide animations when switching between event views
- **Feedback submission**: Success confirmation with gentle fade-in animation
- **Add/delete actions**: Subtle scale and fade effects for adding/removing items

## Component Selection

- **Components**:
  - **Card**: Primary container for recipes, meals, and events with hover states
  - **Accordion**: Recipe variations, ingredient lists, and collapsible instruction sections
  - **Dialog**: Adding/editing recipes, events, meals, and collecting feedback
  - **Tabs**: Switching between event overview, schedule, shopping list, equipment, and feedback views
  - **Select**: Choosing meal types, cooking methods, and measurement units
  - **Input & Textarea**: Recipe ingredients, instructions, notes, and feedback text
  - **Button**: Actions styled with campfire orange accent for primary actions, muted for secondary
  - **Checkbox**: Shopping list items, equipment checklists
  - **Badge**: Meal type indicators, cooking method tags, equipment categories
  - **Separator**: Visual breaks between meal days and recipe sections
  - **Scroll Area**: Long ingredient lists and instruction sets
  - **Command**: Quick search for recipes when assigning to meals

- **Customizations**:
  - **Event Timeline**: Custom component showing multi-day schedule with meals organized by day
  - **Scaling Controls**: Custom number input with +/- buttons for scout counts
  - **Shopping List Organizer**: Custom categorized list with collapsible sections (proteins, produce, dry goods, etc.)
  - **Recipe Card Grid**: Custom responsive grid with cooking method badges and quick-view details
  - **Feedback Rating**: Custom star or emoji-based rating system for meal feedback

- **States**:
  - Buttons: Solid primary state with deeper shade on hover, subtle shadow on active press
  - Cards: Soft shadow on default, elevated shadow on hover, slight scale transform
  - Inputs: Border highlight with primary color on focus, subtle inner shadow
  - Checkboxes: Campfire orange when checked with smooth transition
  - Disabled: Reduced opacity with stone gray coloring

- **Icon Selection**:
  - Calendar (calendar icon): Events and date selection
  - CookingPot (cooking pot): Recipes and meals
  - ForkKnife: Meal type indicators
  - Flame (fire): Cooking method variations
  - ShoppingCart: Shopping lists
  - Backpack: Equipment lists
  - Users/UsersThree: Scout count
  - Plus/Minus: Adding/removing items and scaling
  - CheckCircle: Completed checklists
  - ChatCircle: Feedback and notes
  - MagnifyingGlass: Search recipes
  - List: Ingredients
  - Pencil: Edit actions

- **Spacing**:
  - Container padding: px-6 py-4 (mobile), px-8 py-6 (desktop)
  - Card internal spacing: p-6
  - Section gaps: gap-8 (between major sections), gap-4 (between related items)
  - List item spacing: gap-3
  - Button padding: px-4 py-2 (small), px-6 py-3 (default), px-8 py-4 (large)
  - Form field spacing: gap-4 vertically

- **Mobile**:
  - Single column layout with full-width cards
  - Tab navigation converts to bottom sheet navigation
  - Sticky header with event name and back navigation
  - Collapsible sections default to closed on mobile
  - Touch-friendly tap targets (minimum 44x44px)
  - Swipe gestures for checking off list items
  - Simplified multi-step forms with progress indicators
  - Recipe details in full-screen modal on mobile vs. side panel on desktop
