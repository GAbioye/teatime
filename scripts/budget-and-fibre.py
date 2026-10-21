"""1) Writes src/recipes-budget.json: original budget recipes (about £1-1.50 a portion).
2) Adds macros.fibre (g per serving) to every starter recipe, worked out from a per-ingredient
   fibre table (UK composition figures, rounded). Run after lowcarb-recipes.py."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FV, MF, DE, BK, CH, FZ, TJ, PRG, WF, HS, SC = (
    "Fruit & veg", "Meat & fish", "Dairy & eggs", "Bakery", "Chilled", "Frozen",
    "Tins & jars", "Pasta, rice & grains", "World foods", "Herbs & spices", "Store cupboard")

# fibre in grams: per gram/ml for g & ml units, otherwise per unit (whole, tin, tbsp, tsp, clove, slice, bunch)
FIBRE = {
    "0% fat Greek yoghurt": 0, "97% pork sausages": 0.3, "Almonds": 0.125, "Apples": 4.0, "Avocado": 9.0, "Back bacon": 0,
    "Bagels": 2.3, "Baked beans": 15.0, "Baking potatoes": 5.5, "Bananas": 3.1, "Basmati rice": 0.013, "Beef mince (5% fat)": 0,
    "Beef mince (20% fat)": 0, "Beef stir-fry strips": 0, "Beef stock cube": 0, "Black beans": 16.0, "Black olives": 0.033,
    "Black peppercorns": 0.5, "Butter": 0, "Butter beans": 11.0, "Caesar dressing": 0, "Carrot": 2.2, "Cauliflower": 12.0,
    "Celery": 3.2, "Cherry tomatoes": 0.012, "Chicken breast": 0, "Chicken stock cube": 0, "Chicken thighs (boneless)": 0,
    "Chickpeas": 14.5, "Chilli powder": 0.9, "Chopped tomatoes": 3.6, "Chorizo": 0, "Coconut milk": 1.0, "Cod fillets": 0,
    "Cooked chicken pieces": 0, "Cooked ham slices": 0, "Cooked king prawns": 0, "Cooked turkey slices": 0, "Cottage cheese": 0,
    "Courgettes": 3.0, "Couscous": 0.05, "Crusty baguette": 6.0, "Cucumber": 1.8, "Curry powder": 2.0, "Double cream": 0,
    "Dried mixed herbs": 0.4, "Dried oregano": 0.4, "Egg noodles": 0.025, "Eggs": 0, "English muffins": 2.2, "Fajita seasoning": 1.0,
    "Feta": 0, "Firm tofu": 0.01, "Fish fingers": 0.3, "Flaked almonds": 0.125, "Fresh coriander": 0.03, "Frozen cauliflower rice": 0.02,
    "Frozen edamame beans": 0.05, "Frozen mixed berries": 0.035, "Frozen peas": 0.052, "Frozen spinach": 0.021, "Garlic": 0.1,
    "Gherkins": 0.012, "Ginger paste": 0.1, "Granola": 0.07, "Green beans": 0.03, "Green curry paste": 0.5, "Green pesto": 0.4,
    "Ground cumin": 0.5, "Half-fat crème fraîche": 0, "Halloumi": 0, "Harissa paste": 0.6, "Honey": 0, "Hummus": 0.06,
    "Iceberg lettuce": 3.0, "Italian hard cheese": 0, "Jasmine rice": 0.01, "Kidney beans": 15.5, "King prawns": 0, "Leeks": 4.4,
    "Lemon": 1.0, "Light coconut milk": 0, "Light cream cheese": 0, "Light mayonnaise": 0, "Lime": 1.0,
    "Mackerel fillets in tomato sauce": 0.5, "Mature cheddar": 0, "Mayonnaise": 0, "Microwave rice pouch": 0.01,
    "Mixed salad leaves": 0.015, "Mozzarella": 0, "Mushrooms": 0.011, "Natural yoghurt": 0, "New potatoes": 0.015,
    "Oatcakes": 0.9, "Olive oil": 0, "Onion": 2.5, "Pak choi": 0.01, "Panko breadcrumbs": 0.03, "Passata": 0.01,
    "Peanut butter": 1.0, "Penne": 0.03, "Peppers": 2.7, "Pork loin chops": 0, "Pork mince": 0, "Pork sausages": 0.4,
    "Porridge oats": 0.09, "Potatoes": 0.016, "Protein bars": 3.0, "Raspberries": 0.065, "Red cabbage": 0.025,
    "Red lentils": 0.11, "Red onion": 2.5, "Romaine lettuce": 5.0, "Salmon fillets": 0, "Savoy cabbage": 0.03,
    "Semi-skimmed milk": 0, "Sesame oil": 0, "Sesame seeds": 0.4, "Sirloin steaks": 0, "Skyr": 0, "Smoked bacon lardons": 0,
    "Smoked mackerel": 0, "Smoked paprika": 0.8, "Smoked salmon": 0, "Soured cream": 0, "Soy sauce": 0.1, "Spaghetti": 0.03,
    "Spinach": 0.022, "Spring onions": 2.6, "Sriracha": 0.1, "Stir-fry vegetables": 0.025, "Sweet potatoes": 6.0,
    "Sweetcorn": 4.0, "Tenderstem broccoli": 0.026, "Teriyaki sauce": 0, "Tikka masala paste": 0.6, "Tortilla wraps": 2.0,
    "Tuna chunks": 0, "Turkey mince": 0, "Turkey rashers": 0, "Vegetable stock cube": 0, "White cabbage": 0.024,
    "Wholegrain mustard": 0.6, "Wholemeal bread": 2.5, "Worcestershire sauce": 0,
}

R = []
def add(meal, name, time, apps, tags, style, macros, ings, steps, serves=2):
    k, p, c, f = macros
    R.append({"name": name, "meal": meal, "time": time, "serves": serves, "appliances": apps, "tags": tags, "style": style,
              "macros": {"kcal": k, "protein": p, "carbs": c, "fat": f},
              "ingredients": [{"name": a, "qty": b, "unit": u, "aisle": s, "cost": co} for a, b, u, s, co in ings],
              "steps": steps, "source": "starter", "fav": False, "budget": True})

# ---------- budget, low carb ----------
add("breakfast", "Cheesy egg & spinach scramble", 10, ["Hob"], ["vegetarian", "gluten-free", "high-protein", "low-carb"], "Quick", (355, 26, 2, 27), [
    ("Eggs", 6, "whole", DE, 1.50), ("Frozen spinach", 150, "g", FZ, 0.30), ("Mature cheddar", 40, "g", DE, 0.40), ("Butter", 10, "g", DE, 0.10)], [
    "Defrost the spinach in the pan with the butter and cook off any water.",
    "Add the beaten eggs and stir gently over a low heat.",
    "Just before they set, stir through the grated cheese."])
add("breakfast", "Egg muffins (makes 8)", 25, ["Oven"], ["vegetarian", "gluten-free", "low-carb"], "Quick", (220, 17, 3, 15), [
    ("Eggs", 8, "whole", DE, 2.00), ("Peppers", 1, "whole", FV, 0.50), ("Spring onions", 1, "bunch", FV, 0.55), ("Mature cheddar", 60, "g", DE, 0.60)], [
    "Heat the oven to 180°C (160°C fan) and grease a muffin tin.",
    "Divide the chopped pepper, spring onions and cheese between 8 holes. Pour over the beaten eggs.",
    "Bake for 18–20 minutes. Two muffins is a serving; they keep for 3 days in the fridge."], serves=4)
add("lunch", "Tuna & egg salad", 12, ["Hob"], ["fish", "gluten-free", "dairy-free", "high-protein", "low-carb"], "Light", (415, 42, 6, 22), [
    ("Tuna chunks", 2, "tin", TJ, 1.80), ("Eggs", 4, "whole", DE, 1.00), ("Iceberg lettuce", 1, "whole", FV, 0.55),
    ("Cucumber", 1, "whole", FV, 0.60), ("Mayonnaise", 2, "tbsp", TJ, 0.20)], [
    "Boil the eggs for 8 minutes, cool and quarter.",
    "Shred the lettuce and slice the cucumber.",
    "Mix the drained tuna with the mayo and pile onto the salad with the eggs."])
add("lunch", "Mackerel, egg & crunchy slaw", 15, ["Hob"], ["fish", "gluten-free", "dairy-free", "low-carb"], "Light", (420, 25, 14, 28), [
    ("Mackerel fillets in tomato sauce", 2, "tin", TJ, 1.60), ("White cabbage", 300, "g", FV, 0.30), ("Carrot", 1, "whole", FV, 0.10),
    ("Light mayonnaise", 2, "tbsp", TJ, 0.15), ("Eggs", 2, "whole", DE, 0.50)], [
    "Boil the eggs for 8 minutes, then cool and halve.",
    "Finely shred the cabbage and grate the carrot. Mix with the mayo and a pinch of salt.",
    "Serve the slaw with the mackerel and eggs."])
add("lunch", "Egg-fried cabbage with ham", 15, ["Hob"], ["dairy-free", "high-protein", "low-carb"], "Quick", (325, 25, 10, 19), [
    ("White cabbage", 400, "g", FV, 0.40), ("Eggs", 4, "whole", DE, 1.00), ("Cooked ham slices", 100, "g", CH, 1.10),
    ("Soy sauce", 2, "tbsp", WF, 0.15), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Stir-fry the finely shredded cabbage in the oil on a high heat for 5 minutes.",
    "Push aside, scramble the eggs, then mix through with the torn ham.",
    "Season with the soy sauce."])
add("dinner", "Chicken thigh, cabbage & bacon traybake", 40, ["Oven"], ["gluten-free", "dairy-free", "high-protein", "low-carb"], "Comfort", (620, 59, 8, 38), [
    ("Chicken thighs (boneless)", 400, "g", MF, 2.60), ("White cabbage", 400, "g", FV, 0.40), ("Smoked bacon lardons", 100, "g", MF, 0.90),
    ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Heat the oven to 200°C (180°C fan).",
    "Toss the chicken, cabbage wedges and lardons with the oil and plenty of pepper.",
    "Roast for 30–35 minutes, turning the cabbage halfway, until the chicken is cooked through."])
add("dinner", "Cheesy mince & cauliflower bake", 45, ["Oven", "Hob"], ["gluten-free", "high-protein", "low-carb"], "Comfort", (480, 31, 10, 34), [
    ("Beef mince (20% fat)", 500, "g", MF, 2.50), ("Cauliflower", 1, "whole", FV, 1.00), ("Chopped tomatoes", 1, "tin", TJ, 0.40),
    ("Onion", 1, "whole", FV, 0.15), ("Mature cheddar", 100, "g", DE, 1.00), ("Dried oregano", 1, "tsp", HS, 0.10)], [
    "Heat the oven to 200°C (180°C fan). Boil the cauliflower florets for 6 minutes and drain well.",
    "Brown the mince with the chopped onion, then add the tomatoes and oregano and simmer for 10 minutes.",
    "Mix with the cauliflower in a dish, top with the cheese and bake for 20 minutes. Serves 4, so it covers two dinners."], serves=4)
add("dinner", "Sausage & cabbage one-pan", 30, ["Hob"], ["pork", "dairy-free"], "Comfort", (520, 27, 20, 34), [
    ("Pork sausages", 6, "whole", MF, 1.50), ("White cabbage", 300, "g", FV, 0.30), ("Onion", 1, "whole", FV, 0.15),
    ("Wholegrain mustard", 1, "tbsp", TJ, 0.15)], [
    "Brown the sausages, then lift out and slice.",
    "Fry the sliced onion and shredded cabbage in the same pan for 8 minutes.",
    "Return the sausages with the mustard and a splash of water and cook for 5 more minutes."])
add("dinner", "Spinach, pepper & feta frittata", 25, ["Hob", "Oven"], ["vegetarian", "gluten-free", "high-protein", "low-carb"], "Quick", (475, 37, 8, 31), [
    ("Eggs", 8, "whole", DE, 2.00), ("Courgettes", 1, "whole", FV, 0.45), ("Peppers", 1, "whole", FV, 0.50),
    ("Frozen spinach", 150, "g", FZ, 0.30), ("Feta", 100, "g", DE, 1.00)], [
    "Soften the chopped courgette and pepper in an ovenproof pan for 6 minutes. Add the defrosted spinach.",
    "Pour in the beaten eggs and crumble over the feta.",
    "Cook on a low heat for 5 minutes, then finish under the grill until set."])
add("dinner", "Budget chicken curry with cauliflower rice", 35, ["Hob"], ["gluten-free", "dairy-free", "high-protein", "low-carb"], "Fakeaway", (360, 42, 13, 15), [
    ("Chicken thighs (boneless)", 600, "g", MF, 3.90), ("Curry powder", 2, "tbsp", HS, 0.20), ("Chopped tomatoes", 1, "tin", TJ, 0.40),
    ("Onion", 1, "whole", FV, 0.15), ("Frozen spinach", 150, "g", FZ, 0.30), ("Cauliflower", 1, "whole", FV, 1.00)], [
    "Soften the chopped onion, add the diced chicken and curry powder and cook for 5 minutes.",
    "Add the tomatoes and a splash of water and simmer for 20 minutes. Stir in the spinach.",
    "Grate the cauliflower, microwave for 4 minutes and serve with the curry. Serves 4, so it covers two dinners."], serves=4)
add("dinner", "Pork mince lettuce cups", 20, ["Hob"], ["pork", "dairy-free", "low-carb"], "Fakeaway", (345, 25, 6, 25), [
    ("Pork mince", 500, "g", MF, 2.80), ("Soy sauce", 2, "tbsp", WF, 0.15), ("Spring onions", 1, "bunch", FV, 0.55),
    ("Carrot", 1, "whole", FV, 0.10), ("Iceberg lettuce", 1, "whole", FV, 0.55), ("Sesame oil", 1, "tbsp", WF, 0.20)], [
    "Fry the mince in the sesame oil until browned and a little crispy.",
    "Add the soy sauce, grated carrot and most of the spring onions and cook for 2 minutes.",
    "Spoon into lettuce leaves and top with the rest of the spring onions. Serves 4."], serves=4)
add("snack", "Peanut butter celery", 3, [], ["vegetarian", "vegan", "gluten-free", "dairy-free", "low-carb"], "Quick", (110, 5, 5, 8), [
    ("Celery", 1, "whole", FV, 0.55), ("Peanut butter", 2, "tbsp", SC, 0.20)], ["Cut half the celery into sticks.", "Spread or dip into the peanut butter."])

# ---------- budget, everyday ----------
add("dinner", "Lentil & bean chilli", 40, ["Hob"], ["vegetarian", "vegan", "gluten-free", "dairy-free"], "Comfort", (515, 21, 96, 2), [
    ("Red lentils", 150, "g", PRG, 0.30), ("Kidney beans", 1, "tin", TJ, 0.45), ("Chopped tomatoes", 2, "tin", TJ, 0.80),
    ("Onion", 1, "whole", FV, 0.15), ("Peppers", 1, "whole", FV, 0.50), ("Chilli powder", 1, "tsp", HS, 0.10),
    ("Ground cumin", 1, "tsp", HS, 0.10), ("Basmati rice", 300, "g", PRG, 0.60)], [
    "Soften the onion and pepper, then add the spices for 1 minute.",
    "Add the lentils, tomatoes, drained beans and 400ml water. Simmer for 25 minutes, stirring.",
    "Serve with rice. Serves 4."], serves=4)
add("dinner", "Chicken & veg fried rice", 25, ["Hob"], ["dairy-free", "high-protein"], "Fakeaway", (580, 38, 66, 17), [
    ("Chicken thighs (boneless)", 400, "g", MF, 2.60), ("Basmati rice", 300, "g", PRG, 0.60), ("Frozen peas", 200, "g", FZ, 0.30),
    ("Eggs", 3, "whole", DE, 0.75), ("Soy sauce", 3, "tbsp", WF, 0.20), ("Spring onions", 1, "bunch", FV, 0.55), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Cook the rice, spread it out and let it steam dry.",
    "Stir-fry the diced chicken in the oil for 6 minutes, then add the peas.",
    "Scramble in the eggs, add the rice and soy sauce and stir-fry for 3 minutes. Top with spring onions. Serves 4."], serves=4)
add("dinner", "Creamy tomato & spinach pasta", 20, ["Hob"], ["vegetarian"], "Quick", (525, 23, 79, 12), [
    ("Penne", 400, "g", PRG, 0.60), ("Chopped tomatoes", 2, "tin", TJ, 0.80), ("Light cream cheese", 150, "g", DE, 0.90),
    ("Frozen spinach", 200, "g", FZ, 0.40), ("Garlic", 2, "clove", FV, 0.20), ("Mature cheddar", 60, "g", DE, 0.60)], [
    "Cook the pasta.",
    "Simmer the tomatoes and garlic for 10 minutes, then stir in the cream cheese and spinach.",
    "Toss with the pasta and top with the cheese. Serves 4."], serves=4)
add("dinner", "Egg & potato hash", 30, ["Hob"], ["vegetarian", "gluten-free", "dairy-free"], "Comfort", (430, 19, 51, 17), [
    ("Potatoes", 500, "g", FV, 0.45), ("Eggs", 4, "whole", DE, 1.00), ("Onion", 1, "whole", FV, 0.15), ("Peppers", 1, "whole", FV, 0.50),
    ("Smoked paprika", 1, "tsp", HS, 0.10), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Boil the diced potatoes for 6 minutes and drain.",
    "Fry them in the oil with the onion, pepper and paprika for 12 minutes until crisp.",
    "Make 4 wells, crack in the eggs, cover and cook until set."])
add("dinner", "Chickpea & spinach curry", 30, ["Hob"], ["vegetarian", "vegan", "gluten-free", "dairy-free"], "Fakeaway", (545, 18, 89, 11), [
    ("Chickpeas", 2, "tin", TJ, 1.00), ("Chopped tomatoes", 2, "tin", TJ, 0.80), ("Onion", 1, "whole", FV, 0.15),
    ("Curry powder", 2, "tbsp", HS, 0.25), ("Frozen spinach", 200, "g", FZ, 0.40), ("Light coconut milk", 400, "ml", WF, 1.00),
    ("Basmati rice", 300, "g", PRG, 0.60)], [
    "Soften the onion, add the curry powder for 1 minute.",
    "Add the chickpeas, tomatoes and coconut milk and simmer for 15 minutes. Stir in the spinach.",
    "Serve with rice. Serves 4."], serves=4)
add("dinner", "Chicken traybake with potatoes & carrots", 50, ["Oven"], ["gluten-free", "dairy-free", "high-protein"], "Comfort", (535, 41, 46, 21), [
    ("Chicken thighs (boneless)", 600, "g", MF, 3.90), ("Potatoes", 800, "g", FV, 0.70), ("Carrot", 4, "whole", FV, 0.40),
    ("Onion", 2, "whole", FV, 0.30), ("Olive oil", 2, "tbsp", SC, 0.20), ("Dried mixed herbs", 1, "tsp", HS, 0.10)], [
    "Heat the oven to 200°C (180°C fan). Toss the chopped potatoes, carrots and onions with half the oil and the herbs. Roast for 20 minutes.",
    "Add the chicken tossed in the rest of the oil and roast for 25 minutes more. Serves 4."], serves=4)
add("dinner", "Tuna pasta bake", 35, ["Oven", "Hob"], ["fish", "high-protein"], "Comfort", (480, 32, 62, 11), [
    ("Penne", 300, "g", PRG, 0.45), ("Tuna chunks", 2, "tin", TJ, 1.80), ("Sweetcorn", 1, "tin", TJ, 0.45),
    ("Chopped tomatoes", 1, "tin", TJ, 0.40), ("Mature cheddar", 100, "g", DE, 1.00)], [
    "Heat the oven to 200°C (180°C fan). Cook the pasta for 2 minutes less than the pack says.",
    "Mix with the tomatoes, drained tuna and sweetcorn in a dish and top with the cheese.",
    "Bake for 20 minutes. Serves 4."], serves=4)
add("breakfast", "Banana oat pancakes", 15, ["Hob"], ["vegetarian"], "Quick", (385, 16, 60, 10), [
    ("Porridge oats", 100, "g", PRG, 0.12), ("Bananas", 2, "whole", FV, 0.30), ("Eggs", 2, "whole", DE, 0.50), ("Semi-skimmed milk", 100, "ml", DE, 0.10)], [
    "Blend everything into a smooth batter.",
    "Cook spoonfuls in a lightly oiled non-stick pan for 2 minutes a side."])

# Fill out the cheap low-carb recipes with cheap calories, so a low-carb week can hit 1,800 kcal on a tight budget.
# (ingredient changes for the whole recipe, per-serving macro difference: kcal, protein, carbs, fat)
BOOST = {
    "Cheesy egg & spinach scramble": ([("set", "Eggs", 8, 2.00), ("set", "Mature cheddar", 60, 0.60)], (114, 9, 1, 9)),
    "Egg-fried cabbage with ham": ([("set", "Eggs", 6, 1.50), ("set", "Olive oil", 2, 0.20)], (132, 6, 0, 12)),
    "Cheesy mince & cauliflower bake": ([("set", "Beef mince (20% fat)", 750, 3.75)], (156, 11, 0, 13)),
    "Budget chicken curry with cauliflower rice": ([("set", "Chicken thighs (boneless)", 800, 5.20), ("add", ("Olive oil", 2, "tbsp", SC, 0.20))], (148, 12, 0, 12)),
    "Pork mince lettuce cups": ([("set", "Pork mince", 750, 4.20)], (140, 12, 0, 10)),
    "Peanut butter celery": ([("set", "Peanut butter", 4, 0.40)], (95, 4, 2, 8)),
}
for r in R:
    if r["name"] not in BOOST: continue
    changes, (dk, dp, dc, df) = BOOST.pop(r["name"])
    for ch in changes:
        if ch[0] == "set":
            ing = next(i for i in r["ingredients"] if i["name"] == ch[1]); ing["qty"], ing["cost"] = ch[2], ch[3]
        else:
            a, b, u, sec, co = ch[1]; r["ingredients"].append({"name": a, "qty": b, "unit": u, "aisle": sec, "cost": co})
    m = r["macros"]; m["kcal"] += dk; m["protein"] += dp; m["carbs"] += dc; m["fat"] += df
assert not BOOST, f"unmatched: {list(BOOST)}"

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]
for r in R:
    r["id"] = "bb-" + slug(r["name"])
json.dump(R, open(os.path.join(ROOT, "src/recipes-budget.json"), "w"), ensure_ascii=False, indent=0)

# ---------- fibre for every starter recipe ----------
missing = set()
for f in ["recipes.json", "recipes-lowcarb.json", "recipes-budget.json"]:
    path = os.path.join(ROOT, "src", f)
    rs = json.load(open(path))
    for r in rs:
        tot = 0.0
        for i in r["ingredients"]:
            if i["name"] not in FIBRE: missing.add(i["name"]); continue
            tot += FIBRE[i["name"]] * i["qty"]
        r["macros"]["fibre"] = round(tot / r["serves"], 1)
    json.dump(rs, open(path, "w"), ensure_ascii=False, indent=0)
assert not missing, f"no fibre value for: {sorted(missing)}"

R = json.load(open(os.path.join(ROOT, "src/recipes-budget.json")))
costs = [(r["name"], sum(i["cost"] for i in r["ingredients"]) / r["serves"], r["macros"]) for r in R]
for n, c, m in costs: print(f"{n[:42]:42s} £{c:.2f}/serving  {m['kcal']}kcal {m['protein']}P {m['carbs']}C {m['fat']}F {m['fibre']}fibre")
print(len(R), "budget recipes; low carb:", sum(1 for r in R if "low-carb" in r["tags"]))
