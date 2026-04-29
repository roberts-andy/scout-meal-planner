"""Seed ~40 sample recipes into the Cosmos DB recipes container.

Usage:
    cd api
    python seed_recipes.py [--troop-id TROOP_ID]

Requires COSMOS_CONNECTION_STRING or COSMOS_ENDPOINT env var.
Defaults to the seed troop 00000000-0000-0000-0000-000000000001.
"""

from __future__ import annotations

import argparse
import asyncio
import time
import uuid

SEED_TROOP_ID = "00000000-0000-0000-0000-000000000001"

SEED_ACTOR = {
    "userId": "seed",
    "displayName": "Seed Admin",
    "email": "admin@example.com",
}


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> int:
    return int(time.time() * 1000)


def _ing(name: str, qty: float, unit: str, *, category: str | None = None, notes: str | None = None) -> dict:
    return {
        "id": _id(),
        "name": name,
        "quantity": qty,
        "unit": unit,
        "estimatedPrice": None,
        "category": category,
        "notes": notes,
    }


def _variation(
    method: str,
    instructions: list[str],
    equipment: list[str],
    *,
    cooking_time: str | None = None,
    difficulty: str = "easy",
) -> dict:
    return {
        "id": _id(),
        "cookingMethod": method,
        "instructions": instructions,
        "equipment": equipment,
        "cookingTime": cooking_time,
        "difficulty": difficulty,
        "notes": None,
    }


def _recipe(name: str, description: str, servings: int, tags: list[str], ingredients: list[dict], variations: list[dict]) -> dict:
    now = _now()
    return {
        "id": _id(),
        "troopId": SEED_TROOP_ID,
        "name": name,
        "description": description,
        "servings": servings,
        "tags": tags,
        "ingredients": ingredients,
        "variations": variations,
        "clonedFrom": None,
        "currentVersion": None,
        "versions": None,
        "moderation": {"status": "approved", "flaggedFields": []},
        "createdAt": now,
        "createdBy": SEED_ACTOR,
        "updatedAt": now,
        "updatedBy": SEED_ACTOR,
    }


# ---------------------------------------------------------------------------
# BREAKFAST RECIPES (14)
# ---------------------------------------------------------------------------

RECIPES: list[dict] = [
    _recipe(
        "Campfire Scrambled Eggs",
        "Fluffy scrambled eggs cooked over an open fire — a scout breakfast staple.",
        8,
        ["breakfast", "easy", "high-protein"],
        [
            _ing("eggs", 16, "whole", category="dairy"),
            _ing("butter", 2, "tbsp", category="dairy"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("milk", 0.25, "cup", category="dairy"),
        ],
        [
            _variation("skillet", [
                "Crack eggs into a bowl and whisk with milk, salt, and pepper.",
                "Melt butter in skillet over medium heat.",
                "Pour in egg mixture and stir gently with a spatula.",
                "Cook until eggs are set but still moist, about 3-4 minutes.",
                "Remove from heat and serve immediately.",
            ], ["cast iron skillet", "mixing bowl", "whisk", "spatula"], cooking_time="10 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Pancakes with Maple Syrup",
        "Classic fluffy pancakes made from scratch, perfect for feeding a hungry patrol.",
        8,
        ["breakfast", "easy", "crowd-pleaser"],
        [
            _ing("all-purpose flour", 2, "cup", category="dry goods"),
            _ing("sugar", 2, "tbsp", category="dry goods"),
            _ing("baking powder", 2, "tsp", category="dry goods"),
            _ing("salt", 0.5, "tsp", category="seasoning"),
            _ing("eggs", 2, "whole", category="dairy"),
            _ing("milk", 1.5, "cup", category="dairy"),
            _ing("vegetable oil", 2, "tbsp", category="oils"),
            _ing("maple syrup", 1, "cup", category="condiments"),
        ],
        [
            _variation("camp-stove", [
                "Mix flour, sugar, baking powder, and salt in a large bowl.",
                "In a separate bowl, whisk eggs, milk, and oil.",
                "Pour wet ingredients into dry and stir until just combined (lumps are fine).",
                "Heat a lightly greased griddle over medium heat.",
                "Pour 1/4 cup batter per pancake onto the griddle.",
                "Cook until bubbles form on the surface, then flip and cook 1-2 minutes more.",
                "Serve hot with maple syrup.",
            ], ["griddle or large skillet", "mixing bowls", "whisk", "ladle"], cooking_time="25 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Breakfast Burritos",
        "Hearty burritos loaded with eggs, sausage, cheese, and peppers.",
        10,
        ["breakfast", "medium", "high-protein", "make-ahead"],
        [
            _ing("flour tortillas (large)", 10, "whole", category="dry goods"),
            _ing("eggs", 12, "whole", category="dairy"),
            _ing("breakfast sausage", 1, "lb", category="meat"),
            _ing("shredded cheddar cheese", 2, "cup", category="dairy"),
            _ing("green bell pepper", 1, "whole", category="produce"),
            _ing("onion", 1, "whole", category="produce"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("salsa", 1, "cup", category="condiments"),
        ],
        [
            _variation("camp-stove", [
                "Brown sausage in a skillet, breaking into crumbles. Set aside.",
                "Dice pepper and onion; sauté in the same skillet until soft.",
                "Scramble eggs in a separate skillet.",
                "Warm tortillas on the griddle for 15 seconds each side.",
                "Assemble: eggs, sausage, veggies, cheese, and salsa in each tortilla.",
                "Roll tightly and wrap in foil to keep warm.",
            ], ["two skillets", "spatula", "foil"], cooking_time="30 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Overnight Oats",
        "No-cook oats prepared the night before — just grab and eat in the morning.",
        8,
        ["breakfast", "easy", "no-cook", "make-ahead"],
        [
            _ing("rolled oats", 4, "cup", category="dry goods"),
            _ing("milk", 4, "cup", category="dairy"),
            _ing("honey", 4, "tbsp", category="condiments"),
            _ing("vanilla extract", 2, "tsp", category="baking"),
            _ing("mixed berries", 2, "cup", category="produce"),
            _ing("chia seeds", 4, "tbsp", category="dry goods"),
        ],
        [
            _variation("no-cook", [
                "Combine oats, milk, honey, vanilla, and chia seeds in a container.",
                "Stir well, cover, and refrigerate (or place in cooler) overnight.",
                "In the morning, stir and top with mixed berries.",
                "Serve cold in individual cups or bowls.",
            ], ["large container with lid", "spoon", "cups or bowls"], cooking_time="5 min prep", difficulty="easy"),
        ],
    ),
    _recipe(
        "French Toast",
        "Golden brown French toast dusted with powdered sugar and cinnamon.",
        8,
        ["breakfast", "easy", "crowd-pleaser"],
        [
            _ing("thick-sliced bread", 16, "whole", category="dry goods"),
            _ing("eggs", 6, "whole", category="dairy"),
            _ing("milk", 1, "cup", category="dairy"),
            _ing("cinnamon", 1, "tsp", category="seasoning"),
            _ing("vanilla extract", 1, "tsp", category="baking"),
            _ing("butter", 2, "tbsp", category="dairy"),
            _ing("powdered sugar", 0.5, "cup", category="dry goods"),
            _ing("maple syrup", 1, "cup", category="condiments"),
        ],
        [
            _variation("camp-stove", [
                "Whisk eggs, milk, cinnamon, and vanilla in a shallow dish.",
                "Melt butter on a griddle over medium heat.",
                "Dip bread slices in egg mixture, coating both sides.",
                "Cook on griddle 2-3 minutes per side until golden brown.",
                "Dust with powdered sugar and serve with maple syrup.",
            ], ["griddle or skillet", "shallow dish", "whisk"], cooking_time="20 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Campfire Bacon",
        "Crispy bacon cooked over an open fire — simple and universally loved.",
        8,
        ["breakfast", "easy", "high-protein"],
        [
            _ing("thick-cut bacon", 2, "lb", category="meat"),
        ],
        [
            _variation("open-fire", [
                "Lay bacon strips in a single layer on a cast iron skillet or griddle.",
                "Place over campfire coals (not direct flame) at medium heat.",
                "Cook 3-4 minutes per side, flipping once, until desired crispness.",
                "Transfer to a plate lined with paper towels to drain.",
            ], ["cast iron skillet", "tongs", "paper towels"], cooking_time="15 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Trail Mix Granola Bars",
        "Chewy homemade granola bars packed with oats, nuts, and chocolate chips.",
        12,
        ["breakfast", "snack", "make-ahead", "no-cook"],
        [
            _ing("rolled oats", 3, "cup", category="dry goods"),
            _ing("peanut butter", 0.5, "cup", category="condiments"),
            _ing("honey", 0.5, "cup", category="condiments"),
            _ing("chocolate chips", 0.5, "cup", category="baking"),
            _ing("mixed nuts (chopped)", 0.5, "cup", category="dry goods"),
            _ing("dried cranberries", 0.5, "cup", category="dry goods"),
            _ing("salt", 0.25, "tsp", category="seasoning"),
        ],
        [
            _variation("no-cook", [
                "Warm peanut butter and honey together until pourable (use a small pot or microwave).",
                "Mix oats, chocolate chips, nuts, cranberries, and salt in a large bowl.",
                "Pour peanut butter-honey mixture over dry ingredients and stir to coat.",
                "Press firmly into a lined baking pan.",
                "Refrigerate 2 hours or until firm, then cut into bars.",
            ], ["large bowl", "small pot", "baking pan", "parchment paper"], cooking_time="10 min prep + chill", difficulty="easy"),
        ],
    ),
    _recipe(
        "Hash Browns",
        "Crispy shredded hash browns cooked to golden perfection.",
        8,
        ["breakfast", "easy", "side"],
        [
            _ing("russet potatoes", 4, "lb", category="produce"),
            _ing("vegetable oil", 3, "tbsp", category="oils"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("onion powder", 1, "tsp", category="seasoning"),
        ],
        [
            _variation("skillet", [
                "Peel and shred potatoes using a box grater. Squeeze out excess moisture with a towel.",
                "Toss shredded potatoes with salt, pepper, and onion powder.",
                "Heat oil in a large skillet over medium-high heat.",
                "Spread potatoes in an even layer and press down firmly.",
                "Cook 5-6 minutes without moving until bottom is golden and crispy.",
                "Flip in sections and cook another 4-5 minutes.",
                "Serve hot.",
            ], ["box grater", "large skillet", "spatula", "clean towel"], cooking_time="20 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Sausage and Egg Muffin Sandwiches",
        "Portable breakfast sandwiches perfect for eating on the trail.",
        8,
        ["breakfast", "medium", "high-protein", "portable"],
        [
            _ing("English muffins", 8, "whole", category="dry goods"),
            _ing("breakfast sausage patties", 8, "whole", category="meat"),
            _ing("eggs", 8, "whole", category="dairy"),
            _ing("American cheese slices", 8, "whole", category="dairy"),
            _ing("butter", 1, "tbsp", category="dairy"),
        ],
        [
            _variation("camp-stove", [
                "Cook sausage patties in a skillet until browned on both sides and cooked through.",
                "Fry eggs in butter, one at a time, to over-medium doneness.",
                "Toast English muffin halves on the griddle.",
                "Assemble: muffin bottom, sausage, egg, cheese, muffin top.",
                "Wrap in foil to keep warm for serving.",
            ], ["skillet", "spatula", "foil"], cooking_time="25 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Fruit Salad Cup",
        "Fresh fruit salad with a honey-lime dressing — a light breakfast side.",
        8,
        ["breakfast", "easy", "no-cook", "healthy"],
        [
            _ing("strawberries", 2, "cup", category="produce"),
            _ing("blueberries", 1, "cup", category="produce"),
            _ing("grapes", 1, "cup", category="produce"),
            _ing("banana", 2, "whole", category="produce"),
            _ing("mandarin oranges (canned)", 1, "can", category="canned"),
            _ing("honey", 2, "tbsp", category="condiments"),
            _ing("lime juice", 1, "tbsp", category="produce"),
        ],
        [
            _variation("no-cook", [
                "Wash and chop strawberries. Slice bananas. Drain mandarin oranges.",
                "Combine all fruit in a large bowl.",
                "Whisk honey and lime juice together, drizzle over fruit.",
                "Toss gently and serve in individual cups.",
            ], ["large bowl", "knife", "cutting board", "cups"], cooking_time="10 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Cinnamon Roll-Ups",
        "Quick cinnamon sugar roll-ups toasted on a griddle.",
        8,
        ["breakfast", "easy", "sweet"],
        [
            _ing("white bread", 8, "whole", category="dry goods"),
            _ing("butter (softened)", 4, "tbsp", category="dairy"),
            _ing("sugar", 0.25, "cup", category="dry goods"),
            _ing("cinnamon", 2, "tsp", category="seasoning"),
            _ing("cream cheese", 4, "oz", category="dairy"),
        ],
        [
            _variation("camp-stove", [
                "Cut crusts off bread and flatten each slice with a rolling pin or water bottle.",
                "Spread a thin layer of cream cheese on each slice.",
                "Mix sugar and cinnamon; sprinkle over cream cheese.",
                "Roll each slice tightly.",
                "Melt butter on a griddle; toast roll-ups seam side down until golden on all sides.",
            ], ["griddle", "rolling pin or bottle", "knife"], cooking_time="15 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Cowboy Coffee Cake",
        "A rustic coffee cake baked in a Dutch oven over campfire coals.",
        10,
        ["breakfast", "medium", "dutch-oven"],
        [
            _ing("all-purpose flour", 2, "cup", category="dry goods"),
            _ing("sugar", 0.75, "cup", category="dry goods"),
            _ing("butter (cold, cubed)", 0.5, "cup", category="dairy"),
            _ing("baking powder", 1.5, "tsp", category="dry goods"),
            _ing("baking soda", 0.5, "tsp", category="dry goods"),
            _ing("salt", 0.25, "tsp", category="seasoning"),
            _ing("egg", 1, "whole", category="dairy"),
            _ing("buttermilk", 0.75, "cup", category="dairy"),
            _ing("cinnamon", 1, "tsp", category="seasoning"),
            _ing("brown sugar", 0.25, "cup", category="dry goods"),
        ],
        [
            _variation("dutch-oven", [
                "Mix flour, sugar, baking powder, baking soda, and salt. Cut in cold butter until crumbly.",
                "Reserve 0.5 cup of the crumb mixture for topping.",
                "Beat egg and buttermilk; stir into remaining crumb mixture until just combined.",
                "Pour batter into a greased Dutch oven.",
                "Mix reserved crumbs with cinnamon and brown sugar; sprinkle over batter.",
                "Cover and bake with coals on top and bottom for 25-30 minutes until a toothpick comes out clean.",
            ], ["Dutch oven", "mixing bowl", "pastry cutter or fork"], cooking_time="40 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Oatmeal with Brown Sugar and Apples",
        "Warm and filling oatmeal topped with diced apples and brown sugar.",
        8,
        ["breakfast", "easy", "healthy"],
        [
            _ing("instant oatmeal", 4, "cup", category="dry goods"),
            _ing("water", 8, "cup", category="other"),
            _ing("brown sugar", 0.5, "cup", category="dry goods"),
            _ing("apples", 3, "whole", category="produce"),
            _ing("cinnamon", 1, "tsp", category="seasoning"),
            _ing("salt", 0.25, "tsp", category="seasoning"),
        ],
        [
            _variation("camp-stove", [
                "Bring water and salt to a boil in a large pot.",
                "Stir in oatmeal, reduce heat, and cook 3-5 minutes until thickened.",
                "While oatmeal cooks, dice apples into small pieces.",
                "Serve oatmeal topped with diced apples, brown sugar, and a dash of cinnamon.",
            ], ["large pot", "spoon", "knife", "cutting board"], cooking_time="10 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Egg-in-a-Hole",
        "Eggs fried inside a hole cut in a slice of bread — fun and easy for scouts to make.",
        8,
        ["breakfast", "easy", "kid-friendly"],
        [
            _ing("bread", 8, "whole", category="dry goods"),
            _ing("eggs", 8, "whole", category="dairy"),
            _ing("butter", 2, "tbsp", category="dairy"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
        ],
        [
            _variation("skillet", [
                "Use a cup or cookie cutter to cut a hole in the center of each bread slice.",
                "Melt butter in a skillet over medium heat.",
                "Place bread in skillet and crack an egg into the hole.",
                "Season with salt and pepper.",
                "Cook 2-3 minutes until the egg white sets, then flip carefully.",
                "Cook another minute and serve. Toast the bread cutouts alongside as a snack.",
            ], ["skillet", "cup or cookie cutter", "spatula"], cooking_time="15 min", difficulty="easy"),
        ],
    ),

    # ---------------------------------------------------------------------------
    # LUNCH RECIPES (13)
    # ---------------------------------------------------------------------------

    _recipe(
        "Grilled Cheese Sandwiches",
        "Classic golden grilled cheese sandwiches with melty cheddar.",
        8,
        ["lunch", "easy", "kid-friendly"],
        [
            _ing("white bread", 16, "whole", category="dry goods"),
            _ing("cheddar cheese slices", 16, "whole", category="dairy"),
            _ing("butter", 4, "tbsp", category="dairy"),
        ],
        [
            _variation("skillet", [
                "Butter one side of each bread slice.",
                "Place a slice butter-side down on a skillet over medium heat.",
                "Add two slices of cheese and top with another bread slice, butter-side up.",
                "Cook 2-3 minutes until bottom is golden, then flip.",
                "Cook another 2 minutes until cheese melts and both sides are golden.",
                "Slice diagonally and serve.",
            ], ["skillet", "spatula"], cooking_time="15 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Walking Tacos",
        "Individual taco bags — crush the chips, add toppings, and eat with a fork.",
        10,
        ["lunch", "easy", "kid-friendly", "no-cook-option"],
        [
            _ing("individual bags of corn chips", 10, "package", category="dry goods"),
            _ing("ground beef", 2, "lb", category="meat"),
            _ing("taco seasoning", 2, "package", category="seasoning"),
            _ing("shredded lettuce", 2, "cup", category="produce"),
            _ing("shredded cheddar cheese", 2, "cup", category="dairy"),
            _ing("diced tomatoes", 2, "cup", category="produce"),
            _ing("sour cream", 1, "cup", category="dairy"),
            _ing("salsa", 1, "cup", category="condiments"),
        ],
        [
            _variation("camp-stove", [
                "Brown ground beef in a skillet, drain excess fat.",
                "Add taco seasoning with water per package directions. Simmer 5 minutes.",
                "Set up a toppings bar with lettuce, cheese, tomatoes, sour cream, and salsa.",
                "Each scout crushes their chip bag, opens it, and adds toppings.",
                "Eat directly from the bag with a fork.",
            ], ["skillet", "spatula", "serving bowls for toppings"], cooking_time="20 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Chicken Quesadillas",
        "Crispy tortillas filled with seasoned chicken and melted cheese.",
        8,
        ["lunch", "medium", "high-protein"],
        [
            _ing("flour tortillas (large)", 8, "whole", category="dry goods"),
            _ing("cooked shredded chicken", 3, "cup", category="meat"),
            _ing("shredded Mexican cheese blend", 2, "cup", category="dairy"),
            _ing("vegetable oil", 1, "tbsp", category="oils"),
            _ing("cumin", 1, "tsp", category="seasoning"),
            _ing("chili powder", 0.5, "tsp", category="seasoning"),
            _ing("salsa", 1, "cup", category="condiments"),
            _ing("sour cream", 0.5, "cup", category="dairy"),
        ],
        [
            _variation("skillet", [
                "Toss shredded chicken with cumin and chili powder.",
                "Place a tortilla in a lightly oiled skillet over medium heat.",
                "Spread chicken and cheese on one half of the tortilla.",
                "Fold tortilla in half and press lightly with a spatula.",
                "Cook 2-3 minutes per side until golden and cheese is melted.",
                "Cut into wedges and serve with salsa and sour cream.",
            ], ["skillet", "spatula", "knife"], cooking_time="20 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "PB&J Trail Wraps",
        "A twist on the classic — peanut butter, jelly, banana, and granola in a wrap.",
        8,
        ["lunch", "easy", "no-cook", "portable"],
        [
            _ing("flour tortillas", 8, "whole", category="dry goods"),
            _ing("peanut butter", 1, "cup", category="condiments"),
            _ing("jelly (grape or strawberry)", 0.5, "cup", category="condiments"),
            _ing("bananas", 4, "whole", category="produce"),
            _ing("granola", 1, "cup", category="dry goods"),
        ],
        [
            _variation("no-cook", [
                "Lay out tortillas and spread peanut butter on each.",
                "Add a stripe of jelly down the center.",
                "Slice bananas and lay slices over the jelly.",
                "Sprinkle granola on top.",
                "Roll tortilla tightly and wrap in plastic wrap or foil for the trail.",
            ], ["knife", "foil or plastic wrap"], cooking_time="10 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Camp Chili",
        "Thick and hearty chili that feeds the whole troop. Great over rice or with cornbread.",
        12,
        ["lunch", "dinner", "medium", "high-protein", "crowd-pleaser"],
        [
            _ing("ground beef", 2, "lb", category="meat"),
            _ing("onion (diced)", 1, "whole", category="produce"),
            _ing("canned kidney beans", 2, "can", category="canned"),
            _ing("canned diced tomatoes", 2, "can", category="canned"),
            _ing("tomato paste", 1, "can", category="canned"),
            _ing("chili powder", 3, "tbsp", category="seasoning"),
            _ing("cumin", 1, "tsp", category="seasoning"),
            _ing("garlic powder", 1, "tsp", category="seasoning"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("water", 1, "cup", category="other"),
        ],
        [
            _variation("camp-stove", [
                "Brown ground beef and onion in a large pot over medium-high heat. Drain fat.",
                "Add kidney beans, diced tomatoes, tomato paste, and water.",
                "Stir in chili powder, cumin, garlic powder, salt, and pepper.",
                "Bring to a boil, then reduce heat and simmer 30 minutes, stirring occasionally.",
                "Serve in bowls topped with shredded cheese if desired.",
            ], ["large pot", "wooden spoon", "can opener", "ladle"], cooking_time="45 min", difficulty="medium"),
            _variation("dutch-oven", [
                "Brown beef and onion in the Dutch oven over coals.",
                "Stir in all canned ingredients, spices, and water.",
                "Cover and cook with coals on top and bottom for 45 minutes.",
                "Stir halfway through. Serve hot.",
            ], ["Dutch oven", "wooden spoon", "can opener"], cooking_time="55 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Hot Dogs on a Stick",
        "The quintessential campfire meal — hot dogs roasted on sticks over the fire.",
        10,
        ["lunch", "easy", "kid-friendly", "campfire"],
        [
            _ing("hot dogs", 10, "whole", category="meat"),
            _ing("hot dog buns", 10, "whole", category="dry goods"),
            _ing("ketchup", 1, "to-taste", category="condiments"),
            _ing("mustard", 1, "to-taste", category="condiments"),
            _ing("relish", 1, "to-taste", category="condiments"),
        ],
        [
            _variation("open-fire", [
                "Find or prepare a long, sturdy stick for each scout (green wood works best).",
                "Skewer a hot dog lengthwise onto each stick.",
                "Hold over campfire coals, rotating slowly, for 5-7 minutes until heated through and slightly charred.",
                "Place in a bun and add desired condiments.",
            ], ["roasting sticks or skewers"], cooking_time="10 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Foil Packet Ham and Cheese",
        "Ham, cheese, and veggies sealed in foil and heated over coals.",
        8,
        ["lunch", "easy", "portable"],
        [
            _ing("deli ham slices", 1, "lb", category="meat"),
            _ing("Swiss cheese slices", 8, "whole", category="dairy"),
            _ing("small potatoes (quartered)", 4, "whole", category="produce"),
            _ing("broccoli florets", 2, "cup", category="produce"),
            _ing("butter", 2, "tbsp", category="dairy"),
            _ing("garlic powder", 0.5, "tsp", category="seasoning"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
        ],
        [
            _variation("open-fire", [
                "Tear off 8 large squares of heavy-duty foil.",
                "Divide potatoes, ham, and broccoli among the sheets.",
                "Dot with butter and season with garlic powder, salt, and pepper.",
                "Top each with a slice of Swiss cheese.",
                "Fold foil into sealed packets.",
                "Place on campfire coals for 15-20 minutes, turning once.",
                "Carefully open (steam will escape) and eat from the foil.",
            ], ["heavy-duty aluminum foil", "tongs"], cooking_time="25 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Trail Hummus Wraps",
        "Quick wraps with hummus, veggies, and turkey — no cooking required.",
        8,
        ["lunch", "easy", "no-cook", "healthy"],
        [
            _ing("flour tortillas", 8, "whole", category="dry goods"),
            _ing("hummus", 2, "cup", category="condiments"),
            _ing("sliced turkey deli meat", 1, "lb", category="meat"),
            _ing("cucumber (sliced)", 1, "whole", category="produce"),
            _ing("shredded carrots", 1, "cup", category="produce"),
            _ing("baby spinach", 2, "cup", category="produce"),
        ],
        [
            _variation("no-cook", [
                "Lay out tortillas and spread hummus generously on each.",
                "Layer turkey, cucumber, carrots, and spinach.",
                "Roll tightly and slice in half.",
                "Wrap in foil for easy transport.",
            ], ["knife", "foil"], cooking_time="10 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Mac and Cheese",
        "Creamy one-pot mac and cheese that scouts devour every time.",
        8,
        ["lunch", "easy", "kid-friendly", "comfort-food"],
        [
            _ing("elbow macaroni", 1, "lb", category="dry goods"),
            _ing("water", 8, "cup", category="other"),
            _ing("butter", 3, "tbsp", category="dairy"),
            _ing("milk", 1, "cup", category="dairy"),
            _ing("shredded cheddar cheese", 3, "cup", category="dairy"),
            _ing("salt", 1, "tsp", category="seasoning"),
            _ing("pepper", 0.5, "tsp", category="seasoning"),
        ],
        [
            _variation("camp-stove", [
                "Bring water and salt to a boil in a large pot.",
                "Add macaroni and cook 8-10 minutes until tender. Drain most of the water, leaving about 1/4 cup.",
                "Return pot to low heat. Stir in butter until melted.",
                "Add milk and stir until combined.",
                "Add shredded cheese in handfuls, stirring until each is melted.",
                "Season with pepper and serve immediately.",
            ], ["large pot", "colander or lid for draining", "wooden spoon"], cooking_time="20 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Tuna Salad Sandwiches",
        "Classic tuna salad on bread — quick, filling, and needs no heat.",
        8,
        ["lunch", "easy", "no-cook", "high-protein"],
        [
            _ing("canned tuna (drained)", 4, "can", category="canned"),
            _ing("mayonnaise", 0.5, "cup", category="condiments"),
            _ing("celery (diced)", 2, "whole", category="produce"),
            _ing("lemon juice", 1, "tbsp", category="produce"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("bread", 16, "whole", category="dry goods"),
            _ing("lettuce leaves", 8, "whole", category="produce"),
        ],
        [
            _variation("no-cook", [
                "Drain tuna and flake into a bowl.",
                "Add mayonnaise, diced celery, lemon juice, salt, and pepper. Mix well.",
                "Divide tuna salad among 8 bread slices.",
                "Top each with a lettuce leaf and another bread slice.",
                "Cut in half and serve.",
            ], ["bowl", "fork", "can opener", "knife"], cooking_time="10 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Loaded Baked Potatoes",
        "Fluffy baked potatoes with all the fixings, cooked in campfire coals.",
        8,
        ["lunch", "medium", "campfire"],
        [
            _ing("large russet potatoes", 8, "whole", category="produce"),
            _ing("butter", 4, "tbsp", category="dairy"),
            _ing("sour cream", 1, "cup", category="dairy"),
            _ing("shredded cheddar cheese", 2, "cup", category="dairy"),
            _ing("bacon bits", 0.5, "cup", category="meat"),
            _ing("chives (chopped)", 0.25, "cup", category="produce"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
        ],
        [
            _variation("open-fire", [
                "Wash potatoes and poke several holes with a fork.",
                "Wrap each potato tightly in heavy-duty foil.",
                "Nestle into hot campfire coals.",
                "Cook 45-60 minutes, turning every 15 minutes, until tender when squeezed.",
                "Carefully unwrap, slice open, and fluff with a fork.",
                "Top with butter, sour cream, cheese, bacon bits, and chives.",
            ], ["heavy-duty foil", "fork", "tongs"], cooking_time="60 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Ramen Noodle Stir-Fry",
        "Quick ramen noodles tossed with veggies and soy sauce for a filling camp lunch.",
        8,
        ["lunch", "easy", "quick"],
        [
            _ing("instant ramen noodles (discard seasoning)", 8, "package", category="dry goods"),
            _ing("vegetable oil", 2, "tbsp", category="oils"),
            _ing("soy sauce", 3, "tbsp", category="condiments"),
            _ing("frozen mixed vegetables", 4, "cup", category="produce"),
            _ing("garlic powder", 0.5, "tsp", category="seasoning"),
            _ing("sesame oil", 1, "tsp", category="oils"),
        ],
        [
            _variation("camp-stove", [
                "Cook ramen noodles per package (discard seasoning packets). Drain and set aside.",
                "Heat vegetable oil in a large skillet.",
                "Stir-fry frozen vegetables until heated through, about 3-4 minutes.",
                "Add cooked noodles to the skillet.",
                "Drizzle with soy sauce and sesame oil; toss to combine.",
                "Season with garlic powder and serve hot.",
            ], ["large pot", "skillet", "tongs"], cooking_time="15 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Chicken Noodle Soup",
        "Warm and comforting chicken noodle soup for a chilly camp day.",
        10,
        ["lunch", "medium", "comfort-food"],
        [
            _ing("chicken broth", 8, "cup", category="canned"),
            _ing("cooked shredded chicken", 2, "cup", category="meat"),
            _ing("egg noodles", 3, "cup", category="dry goods"),
            _ing("carrots (sliced)", 2, "whole", category="produce"),
            _ing("celery (sliced)", 2, "whole", category="produce"),
            _ing("onion (diced)", 1, "whole", category="produce"),
            _ing("garlic (minced)", 2, "tsp", category="produce"),
            _ing("olive oil", 1, "tbsp", category="oils"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("dried thyme", 0.5, "tsp", category="seasoning"),
        ],
        [
            _variation("camp-stove", [
                "Heat olive oil in a large pot. Sauté onion, carrots, celery, and garlic until softened (5 minutes).",
                "Add chicken broth, thyme, salt, and pepper. Bring to a boil.",
                "Add egg noodles and cook 8 minutes until tender.",
                "Stir in shredded chicken and heat through.",
                "Ladle into bowls and serve hot.",
            ], ["large pot", "ladle", "knife", "cutting board"], cooking_time="30 min", difficulty="medium"),
        ],
    ),

    # ---------------------------------------------------------------------------
    # DINNER RECIPES (13)
    # ---------------------------------------------------------------------------

    _recipe(
        "Foil Packet Chicken Fajitas",
        "Seasoned chicken strips with peppers and onions, cooked in foil over the fire.",
        8,
        ["dinner", "medium", "high-protein"],
        [
            _ing("boneless chicken breasts", 2, "lb", category="meat"),
            _ing("bell peppers (mixed, sliced)", 3, "whole", category="produce"),
            _ing("onion (sliced)", 2, "whole", category="produce"),
            _ing("fajita seasoning", 2, "tbsp", category="seasoning"),
            _ing("olive oil", 2, "tbsp", category="oils"),
            _ing("flour tortillas", 8, "whole", category="dry goods"),
            _ing("lime", 2, "whole", category="produce"),
            _ing("salsa", 1, "cup", category="condiments"),
            _ing("sour cream", 0.5, "cup", category="dairy"),
        ],
        [
            _variation("open-fire", [
                "Slice chicken into thin strips and toss with fajita seasoning and olive oil.",
                "Divide chicken, peppers, and onions onto 8 sheets of heavy-duty foil.",
                "Squeeze lime juice over each portion.",
                "Seal foil packets tightly.",
                "Place on campfire grate or coals for 15-20 minutes, flipping once.",
                "Open carefully and serve in warm tortillas with salsa and sour cream.",
            ], ["heavy-duty foil", "tongs", "knife", "cutting board"], cooking_time="30 min", difficulty="medium"),
            _variation("grill", [
                "Slice chicken and toss with seasoning and oil.",
                "Grill chicken strips 5-6 minutes per side.",
                "Grill peppers and onions alongside or in a grill basket.",
                "Warm tortillas on the grill 15 seconds per side.",
                "Assemble fajitas and serve.",
            ], ["grill", "grill basket", "tongs"], cooking_time="20 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Dutch Oven Lasagna",
        "Layered lasagna baked in a Dutch oven — a camp dinner worth the effort.",
        10,
        ["dinner", "hard", "crowd-pleaser", "dutch-oven"],
        [
            _ing("lasagna noodles (no-boil)", 12, "whole", category="dry goods"),
            _ing("ground beef", 1.5, "lb", category="meat"),
            _ing("marinara sauce", 4, "cup", category="canned"),
            _ing("ricotta cheese", 2, "cup", category="dairy"),
            _ing("shredded mozzarella", 3, "cup", category="dairy"),
            _ing("parmesan cheese (grated)", 0.5, "cup", category="dairy"),
            _ing("egg", 1, "whole", category="dairy"),
            _ing("Italian seasoning", 1, "tsp", category="seasoning"),
            _ing("salt", 1, "to-taste", category="seasoning"),
        ],
        [
            _variation("dutch-oven", [
                "Brown ground beef in the Dutch oven over coals. Drain fat and set meat aside.",
                "Mix ricotta, egg, half the mozzarella, parmesan, and Italian seasoning.",
                "Spread a thin layer of marinara on the bottom of the Dutch oven.",
                "Layer: noodles, ricotta mixture, beef, marinara. Repeat 2-3 times.",
                "Top with remaining marinara and mozzarella.",
                "Cover and bake with coals on top and bottom for 30-40 minutes until bubbly.",
                "Let rest 10 minutes before serving.",
            ], ["Dutch oven", "mixing bowl", "spoon"], cooking_time="60 min", difficulty="hard"),
        ],
    ),
    _recipe(
        "Grilled Hamburgers",
        "Juicy grilled burgers with all the classic toppings.",
        10,
        ["dinner", "easy", "crowd-pleaser", "high-protein"],
        [
            _ing("ground beef (80/20)", 2.5, "lb", category="meat"),
            _ing("hamburger buns", 10, "whole", category="dry goods"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("lettuce leaves", 10, "whole", category="produce"),
            _ing("tomato slices", 10, "whole", category="produce"),
            _ing("onion slices", 10, "whole", category="produce"),
            _ing("cheese slices", 10, "whole", category="dairy"),
            _ing("ketchup", 1, "to-taste", category="condiments"),
            _ing("mustard", 1, "to-taste", category="condiments"),
        ],
        [
            _variation("grill", [
                "Divide beef into 10 portions and shape into patties slightly larger than the buns.",
                "Season both sides generously with salt and pepper.",
                "Grill over medium-high heat 4-5 minutes per side for medium doneness.",
                "Add cheese slices in the last minute of cooking.",
                "Toast buns on the grill 30 seconds.",
                "Assemble burgers with desired toppings and serve.",
            ], ["grill", "spatula"], cooking_time="20 min", difficulty="easy"),
            _variation("skillet", [
                "Shape beef into patties and season with salt and pepper.",
                "Heat a skillet over medium-high heat.",
                "Cook patties 4-5 minutes per side.",
                "Add cheese slice on top, cover for 30 seconds to melt.",
                "Serve on toasted buns with toppings.",
            ], ["cast iron skillet", "spatula", "lid"], cooking_time="20 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Campfire Stew",
        "A thick and warming stew with beef, potatoes, and carrots cooked over the fire.",
        10,
        ["dinner", "medium", "comfort-food"],
        [
            _ing("beef stew meat (cubed)", 2, "lb", category="meat"),
            _ing("potatoes (cubed)", 4, "whole", category="produce"),
            _ing("carrots (sliced)", 4, "whole", category="produce"),
            _ing("onion (diced)", 1, "whole", category="produce"),
            _ing("beef broth", 4, "cup", category="canned"),
            _ing("tomato paste", 2, "tbsp", category="canned"),
            _ing("flour", 2, "tbsp", category="dry goods"),
            _ing("vegetable oil", 2, "tbsp", category="oils"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("dried rosemary", 0.5, "tsp", category="seasoning"),
            _ing("dried thyme", 0.5, "tsp", category="seasoning"),
        ],
        [
            _variation("dutch-oven", [
                "Toss beef cubes in flour. Heat oil in the Dutch oven and brown the beef in batches.",
                "Add onion and cook until softened.",
                "Stir in tomato paste, then pour in beef broth.",
                "Add potatoes, carrots, rosemary, thyme, salt, and pepper.",
                "Cover and simmer over low coals for 60-90 minutes until beef is tender.",
                "Stir occasionally, adding water if the stew gets too thick.",
                "Serve in bowls with crusty bread.",
            ], ["Dutch oven", "wooden spoon", "tongs"], cooking_time="90 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Spaghetti and Meat Sauce",
        "A big pot of spaghetti with homemade meat sauce — camp comfort food at its best.",
        10,
        ["dinner", "medium", "crowd-pleaser"],
        [
            _ing("spaghetti", 1.5, "lb", category="dry goods"),
            _ing("ground beef", 1.5, "lb", category="meat"),
            _ing("onion (diced)", 1, "whole", category="produce"),
            _ing("garlic (minced)", 3, "tsp", category="produce"),
            _ing("canned crushed tomatoes", 2, "can", category="canned"),
            _ing("tomato paste", 1, "can", category="canned"),
            _ing("Italian seasoning", 2, "tsp", category="seasoning"),
            _ing("sugar", 1, "tsp", category="dry goods"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("olive oil", 1, "tbsp", category="oils"),
            _ing("parmesan cheese (grated)", 0.5, "cup", category="dairy"),
        ],
        [
            _variation("camp-stove", [
                "Heat olive oil in a large pot. Sauté onion and garlic until fragrant.",
                "Add ground beef and cook until browned. Drain fat.",
                "Stir in crushed tomatoes, tomato paste, Italian seasoning, sugar, salt, and pepper.",
                "Simmer sauce 20 minutes, stirring occasionally.",
                "Meanwhile, cook spaghetti in a separate pot of boiling salted water. Drain.",
                "Serve spaghetti topped with meat sauce and grated parmesan.",
            ], ["two large pots", "wooden spoon", "colander"], cooking_time="35 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "BBQ Chicken Drumsticks",
        "Smoky BBQ drumsticks grilled to perfection.",
        8,
        ["dinner", "medium", "high-protein"],
        [
            _ing("chicken drumsticks", 16, "whole", category="meat"),
            _ing("BBQ sauce", 2, "cup", category="condiments"),
            _ing("olive oil", 2, "tbsp", category="oils"),
            _ing("garlic powder", 1, "tsp", category="seasoning"),
            _ing("onion powder", 1, "tsp", category="seasoning"),
            _ing("paprika", 1, "tsp", category="seasoning"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
        ],
        [
            _variation("grill", [
                "Mix olive oil, garlic powder, onion powder, paprika, salt, and pepper. Coat drumsticks.",
                "Grill over medium heat for 25-30 minutes, turning every 5 minutes.",
                "Brush generously with BBQ sauce during the last 10 minutes of cooking.",
                "Drumsticks are done when internal temperature reaches 165°F.",
                "Serve with extra BBQ sauce for dipping.",
            ], ["grill", "tongs", "basting brush", "meat thermometer"], cooking_time="35 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Campfire Pizza",
        "Personal pizzas cooked in a skillet over the campfire using pita bread as the crust.",
        8,
        ["dinner", "easy", "kid-friendly"],
        [
            _ing("pita bread rounds", 8, "whole", category="dry goods"),
            _ing("pizza sauce", 1.5, "cup", category="canned"),
            _ing("shredded mozzarella", 2, "cup", category="dairy"),
            _ing("pepperoni slices", 1, "package", category="meat"),
            _ing("olive oil", 1, "tbsp", category="oils"),
        ],
        [
            _variation("skillet", [
                "Lightly oil a skillet and place over medium-low heat.",
                "Place a pita in the skillet and spread with pizza sauce.",
                "Top with mozzarella and pepperoni.",
                "Cover the skillet with a lid or foil.",
                "Cook 5-7 minutes until cheese is melted and pita is crispy on the bottom.",
                "Remove carefully and repeat for remaining pizzas.",
            ], ["skillet with lid", "spatula"], cooking_time="30 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Foil Packet Salmon with Veggies",
        "Seasoned salmon fillets with lemon, asparagus, and potatoes in foil.",
        8,
        ["dinner", "medium", "healthy", "high-protein"],
        [
            _ing("salmon fillets (6 oz each)", 8, "whole", category="meat"),
            _ing("asparagus (trimmed)", 2, "lb", category="produce"),
            _ing("baby potatoes (halved)", 2, "lb", category="produce"),
            _ing("olive oil", 3, "tbsp", category="oils"),
            _ing("lemon", 2, "whole", category="produce"),
            _ing("garlic (minced)", 2, "tsp", category="produce"),
            _ing("dried dill", 1, "tsp", category="seasoning"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("pepper", 1, "to-taste", category="seasoning"),
            _ing("butter", 2, "tbsp", category="dairy"),
        ],
        [
            _variation("grill", [
                "Parboil halved baby potatoes for 10 minutes until slightly tender. Drain.",
                "Lay out 8 sheets of heavy-duty foil. Divide potatoes and asparagus among them.",
                "Place a salmon fillet on each; drizzle with olive oil and squeeze lemon over top.",
                "Season with garlic, dill, salt, pepper, and a pat of butter.",
                "Seal foil packets tightly.",
                "Grill over medium heat 12-15 minutes until salmon flakes easily.",
                "Open carefully and serve.",
            ], ["grill", "heavy-duty foil", "pot for parboiling", "tongs"], cooking_time="30 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "Tacos al Pastor",
        "Pineapple and pork tacos with a sweet-spicy marinade.",
        10,
        ["dinner", "medium", "crowd-pleaser"],
        [
            _ing("boneless pork shoulder (thinly sliced)", 2, "lb", category="meat"),
            _ing("pineapple chunks", 2, "cup", category="produce"),
            _ing("corn tortillas", 20, "whole", category="dry goods"),
            _ing("onion (diced)", 1, "whole", category="produce"),
            _ing("cilantro (chopped)", 0.5, "cup", category="produce"),
            _ing("lime", 4, "whole", category="produce"),
            _ing("ancho chili powder", 2, "tbsp", category="seasoning"),
            _ing("cumin", 1, "tsp", category="seasoning"),
            _ing("oregano", 1, "tsp", category="seasoning"),
            _ing("garlic (minced)", 2, "tsp", category="produce"),
            _ing("vegetable oil", 2, "tbsp", category="oils"),
            _ing("pineapple juice", 0.5, "cup", category="condiments"),
        ],
        [
            _variation("skillet", [
                "Mix chili powder, cumin, oregano, garlic, oil, and pineapple juice into a marinade.",
                "Toss sliced pork in the marinade and let sit at least 15 minutes.",
                "Cook pork in a hot skillet 3-4 minutes per side until charred and cooked through.",
                "In the same skillet, sear pineapple chunks until caramelized.",
                "Warm tortillas and assemble tacos: pork, pineapple, onion, cilantro, lime squeeze.",
            ], ["skillet", "tongs", "mixing bowl"], cooking_time="35 min", difficulty="medium"),
        ],
    ),
    _recipe(
        "One-Pot Rice and Beans",
        "Simple, filling, and budget-friendly rice and beans with cumin and lime.",
        10,
        ["dinner", "easy", "budget-friendly", "vegetarian"],
        [
            _ing("long grain rice", 2, "cup", category="dry goods"),
            _ing("canned black beans (drained)", 2, "can", category="canned"),
            _ing("chicken broth", 4, "cup", category="canned"),
            _ing("diced tomatoes with green chiles", 1, "can", category="canned"),
            _ing("cumin", 1.5, "tsp", category="seasoning"),
            _ing("garlic powder", 1, "tsp", category="seasoning"),
            _ing("salt", 1, "to-taste", category="seasoning"),
            _ing("lime", 2, "whole", category="produce"),
            _ing("cilantro (chopped)", 0.25, "cup", category="produce"),
            _ing("olive oil", 1, "tbsp", category="oils"),
        ],
        [
            _variation("camp-stove", [
                "Heat olive oil in a large pot over medium heat.",
                "Add rice and toast for 1-2 minutes, stirring.",
                "Stir in cumin and garlic powder.",
                "Add broth, diced tomatoes, and beans. Bring to a boil.",
                "Reduce heat, cover, and simmer 18-20 minutes until rice is tender and liquid is absorbed.",
                "Fluff with a fork, squeeze lime juice over top, and garnish with cilantro.",
            ], ["large pot with lid", "wooden spoon"], cooking_time="25 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Grilled Bratwursts with Sauerkraut",
        "Juicy bratwursts grilled and served with warm sauerkraut and mustard.",
        8,
        ["dinner", "easy"],
        [
            _ing("bratwursts", 8, "whole", category="meat"),
            _ing("hoagie rolls", 8, "whole", category="dry goods"),
            _ing("sauerkraut", 2, "cup", category="canned"),
            _ing("spicy brown mustard", 1, "to-taste", category="condiments"),
            _ing("onion (sliced)", 1, "whole", category="produce"),
            _ing("butter", 1, "tbsp", category="dairy"),
        ],
        [
            _variation("grill", [
                "Grill bratwursts over medium heat for 15-20 minutes, turning frequently, until cooked through.",
                "Sauté sliced onion in butter in a skillet until caramelized (about 10 minutes).",
                "Warm sauerkraut in a small pot.",
                "Toast hoagie rolls lightly on the grill.",
                "Assemble: brat in a roll topped with sauerkraut, onions, and mustard.",
            ], ["grill", "skillet", "small pot", "tongs"], cooking_time="25 min", difficulty="easy"),
        ],
    ),
    _recipe(
        "Dutch Oven Chicken and Dumplings",
        "Creamy chicken stew topped with fluffy dumplings — ultimate comfort food.",
        10,
        ["dinner", "hard", "comfort-food", "dutch-oven"],
        [
            _ing("boneless chicken thighs", 2, "lb", category="meat"),
            _ing("chicken broth", 6, "cup", category="canned"),
            _ing("carrots (sliced)", 3, "whole", category="produce"),
            _ing("celery (sliced)", 3, "whole", category="produce"),
            _ing("onion (diced)", 1, "whole", category="produce"),
            _ing("all-purpose flour", 2, "cup", category="dry goods"),
            _ing("baking powder", 1, "tbsp", category="dry goods"),
            _ing("salt", 1, "tsp", category="seasoning"),
            _ing("milk", 0.75, "cup", category="dairy"),
            _ing("butter", 3, "tbsp", category="dairy"),
            _ing("dried thyme", 1, "tsp", category="seasoning"),
            _ing("pepper", 0.5, "tsp", category="seasoning"),
        ],
        [
            _variation("dutch-oven", [
                "Cut chicken into bite-sized pieces. Brown in butter in the Dutch oven.",
                "Add onion, carrots, and celery. Cook 5 minutes until softened.",
                "Pour in chicken broth. Add thyme, salt, and pepper. Bring to a simmer.",
                "Cook 15 minutes until chicken is cooked through.",
                "Mix flour, baking powder, salt, and milk into a thick dumpling dough.",
                "Drop spoonfuls of dough on top of the stew (do not stir).",
                "Cover and cook 15-18 minutes with coals on top until dumplings are fluffy and cooked through.",
            ], ["Dutch oven", "mixing bowl", "spoon", "knife"], cooking_time="50 min", difficulty="hard"),
        ],
    ),
    _recipe(
        "Teriyaki Chicken Skewers",
        "Sweet teriyaki-glazed chicken skewers with veggies, grilled over the fire.",
        8,
        ["dinner", "medium", "high-protein"],
        [
            _ing("boneless chicken breasts (cubed)", 2, "lb", category="meat"),
            _ing("teriyaki sauce", 1, "cup", category="condiments"),
            _ing("bell peppers (chunked)", 2, "whole", category="produce"),
            _ing("red onion (chunked)", 1, "whole", category="produce"),
            _ing("zucchini (sliced)", 2, "whole", category="produce"),
            _ing("pineapple chunks", 1, "cup", category="produce"),
            _ing("vegetable oil", 1, "tbsp", category="oils"),
            _ing("sesame seeds", 1, "tbsp", category="seasoning"),
        ],
        [
            _variation("grill", [
                "Marinate chicken cubes in teriyaki sauce for at least 30 minutes.",
                "Thread chicken, peppers, onion, zucchini, and pineapple onto skewers, alternating.",
                "Brush lightly with oil.",
                "Grill over medium heat 10-12 minutes, turning every 3 minutes.",
                "Brush with extra teriyaki during the last 2 minutes.",
                "Sprinkle with sesame seeds and serve.",
            ], ["grill", "skewers (metal or soaked wooden)", "basting brush"], cooking_time="15 min + marinade", difficulty="medium"),
        ],
    ),
]


async def seed_recipes(troop_id: str) -> None:
    from app.cosmosdb import init_database, create_item

    await init_database()

    for recipe in RECIPES:
        recipe["troopId"] = troop_id
        try:
            await create_item("recipes", recipe)
            print(f"  + {recipe['name']}")
        except Exception as exc:
            if getattr(exc, "status_code", None) == 409:
                print(f"  = {recipe['name']} (already exists)")
            else:
                print(f"  ! {recipe['name']}: {exc}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed sample recipes into Cosmos DB")
    parser.add_argument("--troop-id", default=SEED_TROOP_ID, help="Target troop ID")
    args = parser.parse_args()

    print(f"Seeding {len(RECIPES)} recipes for troop {args.troop_id}...")
    await seed_recipes(args.troop_id)
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
