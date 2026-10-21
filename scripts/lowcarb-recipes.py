"""Low-carb starter recipes for Teatime (serves 2; macros are per serving).
Writes src/recipes-lowcarb.json, which the app merges into existing recipe books."""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FV, MF, DE, BK, CH, FZ, TJ, PRG, WF, HS, SC = (
    "Fruit & veg", "Meat & fish", "Dairy & eggs", "Bakery", "Chilled", "Frozen",
    "Tins & jars", "Pasta, rice & grains", "World foods", "Herbs & spices", "Store cupboard")
R = []


def add(meal, name, time, apps, tags, style, macros, ings, steps, of=None):
    k, p, c, f = macros
    r = {"name": name, "meal": meal, "time": time, "serves": 2, "appliances": apps,
         "tags": sorted(set(tags) | {"low-carb"}), "style": style,
         "macros": {"kcal": k, "protein": p, "carbs": c, "fat": f},
         "ingredients": [{"name": a, "qty": b, "unit": u, "aisle": s, "cost": co} for a, b, u, s, co in ings],
         "steps": steps, "source": "starter", "fav": False}
    if of:
        r["lowCarbOf"] = of
    R.append(r)


# ---------------- breakfasts ----------------
add("breakfast", "Spinach & feta omelette", 10, ["Hob"], ["vegetarian", "gluten-free", "high-protein"], "Quick", (390, 27, 3, 30), [
    ("Eggs", 6, "whole", DE, 1.50), ("Spinach", 100, "g", FV, 0.60), ("Feta", 60, "g", DE, 0.60), ("Butter", 15, "g", DE, 0.15)], [
    "Wilt the spinach in half the butter, then tip it out.",
    "Melt the rest of the butter, pour in half the beaten eggs and cook until almost set.",
    "Scatter over half the spinach and feta, fold and slide out. Repeat for the second omelette."])
add("breakfast", "Greek yoghurt, berry & almond bowl", 3, [], ["vegetarian", "gluten-free", "high-protein"], "Quick", (300, 25, 12, 15), [
    ("0% fat Greek yoghurt", 400, "g", DE, 1.20), ("Frozen mixed berries", 120, "g", FZ, 0.45), ("Flaked almonds", 50, "g", SC, 0.75)], [
    "Thaw the berries overnight in the fridge, or microwave for 1 minute.",
    "Spoon the yoghurt into two bowls and top with the berries and almonds."])
add("breakfast", "Smoked salmon, eggs & avocado", 10, ["Hob"], ["fish", "gluten-free", "high-protein"], "Quick", (420, 27, 3, 33), [
    ("Eggs", 4, "whole", DE, 1.00), ("Smoked salmon", 100, "g", MF, 2.50), ("Avocado", 1, "whole", FV, 0.75), ("Butter", 10, "g", DE, 0.10)], [
    "Scramble the eggs gently in the butter until just set.",
    "Slice the avocado.",
    "Serve the eggs with the salmon and avocado, and plenty of black pepper."])
add("breakfast", "Bacon, eggs & mushrooms", 15, ["Hob"], ["pork", "gluten-free", "dairy-free", "high-protein"], "Comfort", (390, 30, 3, 28), [
    ("Back bacon", 4, "whole", MF, 1.40), ("Eggs", 4, "whole", DE, 1.00), ("Mushrooms", 200, "g", FV, 0.70),
    ("Cherry tomatoes", 100, "g", FV, 0.45), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Grill or dry-fry the bacon until crisp.",
    "Fry the sliced mushrooms and halved tomatoes in the oil for 5 minutes.",
    "Fry the eggs and serve everything together."])
add("breakfast", "Ham & cheese omelette", 10, ["Hob"], ["gluten-free", "high-protein"], "Quick", (420, 35, 2, 30), [
    ("Eggs", 6, "whole", DE, 1.50), ("Cooked ham slices", 100, "g", CH, 1.10), ("Mature cheddar", 50, "g", DE, 0.50), ("Butter", 10, "g", DE, 0.10)], [
    "Beat the eggs with a pinch of salt.",
    "Melt half the butter, add half the eggs and cook until almost set.",
    "Add half the torn ham and grated cheese, fold and slide out. Repeat."])
add("breakfast", "Halloumi, egg & tomato fry-up", 15, ["Hob"], ["vegetarian", "gluten-free", "high-protein"], "Comfort", (430, 30, 5, 32), [
    ("Halloumi", 150, "g", DE, 1.35), ("Eggs", 4, "whole", DE, 1.00), ("Cherry tomatoes", 150, "g", FV, 0.70),
    ("Spinach", 80, "g", FV, 0.45), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Fry the sliced halloumi in a dry pan until golden on both sides, then keep warm.",
    "Add the oil and blister the tomatoes for 3 minutes. Wilt in the spinach.",
    "Fry the eggs and serve with the halloumi and veg."])

# ---------------- lunches ----------------
add("lunch", "Chicken Caesar salad", 15, ["Hob"], ["high-protein"], "Light", (430, 42, 3, 27), [
    ("Chicken breast", 300, "g", MF, 2.40), ("Romaine lettuce", 1, "whole", FV, 0.65),
    ("Caesar dressing", 4, "tbsp", CH, 0.55), ("Italian hard cheese", 30, "g", DE, 0.60), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Griddle the seasoned chicken in the oil for 5–6 minutes a side, then slice.",
    "Toss the torn lettuce with the dressing.",
    "Top with the chicken and shaved cheese. Skip the croutons to keep the carbs down."])
add("lunch", "Tuna Niçoise salad", 15, ["Hob"], ["fish", "gluten-free", "dairy-free", "high-protein"], "Light", (470, 42, 6, 30), [
    ("Tuna chunks", 2, "tin", TJ, 1.80), ("Eggs", 4, "whole", DE, 1.00), ("Green beans", 150, "g", FV, 0.80),
    ("Cherry tomatoes", 150, "g", FV, 0.70), ("Black olives", 50, "g", TJ, 0.45), ("Olive oil", 2, "tbsp", SC, 0.20)], [
    "Boil the eggs for 8 minutes, adding the green beans for the last 4. Cool in cold water.",
    "Peel and halve the eggs.",
    "Arrange the beans, tomatoes, olives, drained tuna and eggs in two boxes and dress with the oil and a squeeze of lemon if you have one."])
add("lunch", "Greek salad with chicken", 15, ["Hob"], ["gluten-free", "high-protein"], "Light", (450, 38, 7, 30), [
    ("Chicken breast", 250, "g", MF, 2.00), ("Feta", 100, "g", DE, 1.00), ("Cucumber", 1, "whole", FV, 0.60),
    ("Cherry tomatoes", 150, "g", FV, 0.70), ("Black olives", 50, "g", TJ, 0.45), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Griddle the seasoned chicken for 5–6 minutes a side, then slice.",
    "Chop the cucumber and halve the tomatoes. Mix with the olives and oil.",
    "Top with the chicken and crumbled feta."])
add("lunch", "Prawn & avocado salad", 10, [], ["fish", "gluten-free", "dairy-free", "high-protein"], "Light", (400, 30, 5, 29), [
    ("Cooked king prawns", 300, "g", CH, 4.00), ("Avocado", 1, "whole", FV, 0.75), ("Mixed salad leaves", 100, "g", FV, 0.70),
    ("Mayonnaise", 2, "tbsp", TJ, 0.20), ("Lemon", 1, "whole", FV, 0.30)], [
    "Mix the mayonnaise with a squeeze of lemon and black pepper.",
    "Toss the prawns in the dressing.",
    "Serve on the leaves with sliced avocado."])
add("lunch", "Smoked mackerel & egg salad", 12, ["Hob"], ["fish", "gluten-free", "dairy-free", "high-protein"], "Light", (450, 29, 3, 36), [
    ("Smoked mackerel", 200, "g", CH, 2.20), ("Eggs", 2, "whole", DE, 0.50), ("Mixed salad leaves", 100, "g", FV, 0.70),
    ("Cucumber", 1, "whole", FV, 0.60), ("Lemon", 1, "whole", FV, 0.30)], [
    "Boil the eggs for 8 minutes, cool and quarter.",
    "Flake the mackerel and slice the cucumber.",
    "Pile everything onto the leaves and squeeze over the lemon."])
add("lunch", "Turkey & cheese lettuce wraps", 5, [], ["gluten-free", "high-protein"], "Quick", (360, 33, 5, 22), [
    ("Cooked turkey slices", 200, "g", CH, 2.50), ("Mature cheddar", 60, "g", DE, 0.60), ("Romaine lettuce", 1, "whole", FV, 0.65),
    ("Mayonnaise", 1, "tbsp", TJ, 0.10), ("Cherry tomatoes", 100, "g", FV, 0.45)], [
    "Separate the large lettuce leaves to use as wraps.",
    "Spread each with a little mayo, then add turkey, sliced cheese and tomato.",
    "Roll up and eat straight away, or pack the parts separately for later."])
add("lunch", "Chicken pesto courgetti", 15, ["Hob"], ["gluten-free", "high-protein"], "Quick", (420, 38, 7, 26), [
    ("Chicken breast", 250, "g", MF, 2.00), ("Courgettes", 2, "whole", FV, 0.90), ("Green pesto", 3, "tbsp", TJ, 0.60),
    ("Italian hard cheese", 20, "g", DE, 0.40), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Spiralise the courgettes, or cut them into ribbons with a peeler.",
    "Fry the diced chicken in the oil for 8 minutes until cooked through.",
    "Add the courgetti for 2 minutes, then stir through the pesto. Finish with grated cheese."])
add("lunch", "Halloumi & roasted veg salad", 25, ["Oven"], ["vegetarian", "gluten-free"], "Light", (470, 24, 9, 37), [
    ("Halloumi", 200, "g", DE, 1.80), ("Peppers", 1, "whole", FV, 0.50), ("Courgettes", 1, "whole", FV, 0.45),
    ("Mixed salad leaves", 60, "g", FV, 0.40), ("Olive oil", 2, "tbsp", SC, 0.20)], [
    "Heat the oven to 200°C (180°C fan). Roast the chopped pepper and courgette in half the oil for 15 minutes.",
    "Add the sliced halloumi and roast for 8 more minutes.",
    "Serve over the leaves with the rest of the oil."])

# ---------------- dinners: new ----------------
add("dinner", "Lemon & garlic chicken thighs with greens", 35, ["Oven"], ["gluten-free", "dairy-free", "high-protein"], "Comfort", (500, 50, 7, 29), [
    ("Chicken thighs (boneless)", 400, "g", MF, 2.60), ("Tenderstem broccoli", 200, "g", FV, 1.50), ("Green beans", 150, "g", FV, 0.80),
    ("Lemon", 1, "whole", FV, 0.30), ("Garlic", 2, "clove", FV, 0.20), ("Olive oil", 2, "tbsp", SC, 0.20)], [
    "Heat the oven to 200°C (180°C fan). Toss the chicken with half the oil, crushed garlic, lemon zest and juice.",
    "Roast for 20 minutes.",
    "Add the broccoli and beans tossed in the rest of the oil, and roast for 10–12 more minutes."])
add("dinner", "Burger bowl", 20, ["Hob"], ["gluten-free", "high-protein"], "Fakeaway", (520, 48, 6, 33), [
    ("Beef mince (5% fat)", 400, "g", MF, 3.20), ("Mature cheddar", 40, "g", DE, 0.40), ("Romaine lettuce", 1, "whole", FV, 0.65),
    ("Cherry tomatoes", 150, "g", FV, 0.70), ("Gherkins", 60, "g", TJ, 0.30), ("Mayonnaise", 2, "tbsp", TJ, 0.20)], [
    "Shape the mince into 4 patties, season and fry for 4 minutes a side. Top with cheese for the last minute.",
    "Chop the lettuce, halve the tomatoes and slice the gherkins.",
    "Serve the burgers on the salad with mayo mixed with a spoon of gherkin juice."])
add("dinner", "Garlic butter salmon with spinach", 20, ["Hob", "Oven"], ["fish", "gluten-free", "high-protein"], "Light", (470, 32, 5, 35), [
    ("Salmon fillets", 2, "whole", MF, 3.50), ("Spinach", 200, "g", FV, 1.20), ("Tenderstem broccoli", 200, "g", FV, 1.50),
    ("Butter", 25, "g", DE, 0.25), ("Garlic", 2, "clove", FV, 0.20)], [
    "Heat the oven to 200°C (180°C fan) and roast the salmon for 12–14 minutes.",
    "Steam the broccoli for 4 minutes.",
    "Melt the butter with the sliced garlic, wilt in the spinach and serve with the salmon and broccoli."])
add("dinner", "Steak with peppercorn sauce & greens", 20, ["Hob"], ["gluten-free", "high-protein"], "Comfort", (600, 52, 6, 40), [
    ("Sirloin steaks", 2, "whole", MF, 9.00), ("Double cream", 80, "ml", DE, 0.50), ("Black peppercorns", 1, "tsp", HS, 0.10),
    ("Green beans", 200, "g", FV, 1.00), ("Mushrooms", 150, "g", FV, 0.55)], [
    "Bring the steaks to room temperature and season well.",
    "Sear in a very hot pan for 2–3 minutes a side, then rest. Fry the mushrooms in the same pan.",
    "Add the crushed peppercorns and cream, bubble for 1 minute and pour over the steaks. Serve with boiled green beans."])
add("dinner", "Pork chops with mustard cream & cabbage", 25, ["Hob"], ["pork", "gluten-free", "high-protein"], "Comfort", (520, 45, 8, 33), [
    ("Pork loin chops", 2, "whole", MF, 3.00), ("Half-fat crème fraîche", 100, "ml", DE, 0.55), ("Wholegrain mustard", 1, "tbsp", TJ, 0.15),
    ("Savoy cabbage", 300, "g", FV, 0.70), ("Butter", 15, "g", DE, 0.15)], [
    "Season the chops and fry for 5–6 minutes a side until cooked through. Rest.",
    "Stir the crème fraîche and mustard into the pan juices and bubble for 1 minute.",
    "Fry the shredded cabbage in the butter for 5 minutes and serve with the chops and sauce."])
add("dinner", "Cod with chorizo & tomatoes", 20, ["Oven"], ["fish", "pork", "gluten-free", "dairy-free", "high-protein"], "Light", (400, 37, 6, 24), [
    ("Cod fillets", 2, "whole", MF, 4.00), ("Chorizo", 70, "g", MF, 1.25), ("Cherry tomatoes", 250, "g", FV, 1.00),
    ("Spinach", 100, "g", FV, 0.60), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Heat the oven to 200°C (180°C fan). Roast the sliced chorizo and tomatoes in the oil for 8 minutes.",
    "Nestle in the cod and roast for 10–12 minutes.",
    "Stir the spinach through the hot tomatoes to wilt, then serve."])
add("dinner", "Thai green chicken curry with cauliflower rice", 30, ["Hob"], ["gluten-free", "dairy-free", "high-protein"], "Fakeaway", (600, 52, 13, 37), [
    ("Chicken thighs (boneless)", 400, "g", MF, 2.60), ("Green curry paste", 2, "tbsp", WF, 0.50), ("Light coconut milk", 400, "ml", WF, 1.00),
    ("Green beans", 150, "g", FV, 0.80), ("Frozen cauliflower rice", 400, "g", FZ, 1.25)], [
    "Fry the paste for 1 minute, then add the diced chicken and cook for 5 minutes.",
    "Pour in the coconut milk and simmer for 15 minutes, adding the beans for the last 5.",
    "Cook the cauliflower rice following the pack and serve with the curry."], of="s-thai-green-veg-curry")
add("dinner", "Halloumi & Mediterranean veg traybake", 35, ["Oven"], ["vegetarian", "gluten-free"], "Comfort", (560, 30, 17, 40), [
    ("Halloumi", 250, "g", DE, 2.25), ("Courgettes", 2, "whole", FV, 0.90), ("Peppers", 2, "whole", FV, 1.00),
    ("Red onion", 1, "whole", FV, 0.25), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Heat the oven to 200°C (180°C fan). Roast the chopped courgettes, peppers and onion in the oil for 20 minutes.",
    "Add the sliced halloumi and roast for 10 more minutes until golden."], of="s-halloumi-chickpea-traybake")

# ---------------- dinners: low-carb versions of existing recipes ----------------
add("dinner", "Bolognese with courgetti", 40, ["Hob"], ["gluten-free", "high-protein"], "Comfort", (470, 52, 18, 20), [
    ("Beef mince (5% fat)", 400, "g", MF, 3.20), ("Courgettes", 3, "whole", FV, 1.35), ("Chopped tomatoes", 1, "tin", TJ, 0.40),
    ("Onion", 1, "whole", FV, 0.15), ("Garlic", 2, "clove", FV, 0.20), ("Dried oregano", 1, "tsp", HS, 0.10), ("Mature cheddar", 30, "g", DE, 0.30)], [
    "Brown the mince, then add the finely chopped onion and cook for 5 minutes.",
    "Add the garlic, oregano and tomatoes. Simmer for 25 minutes.",
    "Spiralise the courgettes and fry for 2 minutes. Serve topped with the sauce and grated cheddar."], of="s-spaghetti-bolognese")
add("dinner", "Beef chilli with cauliflower rice", 40, ["Hob"], ["gluten-free", "high-protein"], "Comfort", (470, 49, 19, 21), [
    ("Beef mince (5% fat)", 400, "g", MF, 3.20), ("Chopped tomatoes", 1, "tin", TJ, 0.40), ("Peppers", 1, "whole", FV, 0.50),
    ("Onion", 1, "whole", FV, 0.15), ("Chilli powder", 1, "tsp", HS, 0.10), ("Ground cumin", 1, "tsp", HS, 0.10),
    ("Frozen cauliflower rice", 400, "g", FZ, 1.25), ("Soured cream", 75, "ml", DE, 0.45)], [
    "Brown the mince with the chopped onion and pepper for 8 minutes. Add the spices for 1 minute.",
    "Add the tomatoes and a splash of water and simmer for 20 minutes.",
    "Cook the cauliflower rice and serve with the chilli and a spoon of soured cream."], of="s-three-bean-veggie-chilli")
add("dinner", "Chicken tikka masala with cauliflower rice", 35, ["Hob"], ["gluten-free", "high-protein"], "Fakeaway", (540, 55, 18, 26), [
    ("Chicken thighs (boneless)", 400, "g", MF, 2.60), ("Tikka masala paste", 3, "tbsp", WF, 0.90), ("Chopped tomatoes", 1, "tin", TJ, 0.40),
    ("Natural yoghurt", 100, "g", DE, 0.25), ("Frozen cauliflower rice", 400, "g", FZ, 1.25), ("Fresh coriander", 15, "g", FV, 0.70)], [
    "Fry the diced chicken with the paste for 5 minutes.",
    "Add the tomatoes and simmer for 20 minutes.",
    "Stir in the yoghurt off the heat. Serve with the cauliflower rice and coriander."], of="s-slow-cooker-chicken-tikka-masala")
add("dinner", "Chicken fajita bowl", 25, ["Hob"], ["gluten-free", "high-protein"], "Fakeaway", (560, 52, 18, 30), [
    ("Chicken breast", 400, "g", MF, 3.20), ("Peppers", 2, "whole", FV, 1.00), ("Red onion", 1, "whole", FV, 0.25),
    ("Fajita seasoning", 1, "tbsp", HS, 0.30), ("Frozen cauliflower rice", 400, "g", FZ, 1.25), ("Soured cream", 75, "ml", DE, 0.45),
    ("Avocado", 1, "whole", FV, 0.75), ("Olive oil", 1, "tbsp", SC, 0.10)], [
    "Fry the sliced chicken, peppers and onion in the oil with the seasoning for 10–12 minutes.",
    "Cook the cauliflower rice.",
    "Serve in bowls with sliced avocado and soured cream. No wraps needed."], of="s-chicken-fajita-traybake")
add("dinner", "Prawn egg-fried cauliflower rice", 15, ["Hob"], ["fish", "gluten-free", "dairy-free", "high-protein"], "Quick", (380, 38, 9, 21), [
    ("King prawns", 250, "g", FZ, 4.15), ("Eggs", 4, "whole", DE, 1.00), ("Frozen cauliflower rice", 400, "g", FZ, 1.25),
    ("Spring onions", 1, "bunch", FV, 0.55), ("Soy sauce", 2, "tbsp", WF, 0.15), ("Sesame oil", 1, "tbsp", WF, 0.20)], [
    "Stir-fry the prawns in the sesame oil for 2 minutes, then push aside.",
    "Scramble the eggs in the pan, then add the cauliflower rice and stir-fry for 4 minutes.",
    "Add the soy sauce and sliced spring onions. Use tamari instead of soy sauce if you need it gluten-free."], of="s-prawn-egg-fried-rice")
add("dinner", "Turkey meatballs with courgetti", 35, ["Oven", "Hob"], ["gluten-free", "high-protein"], "Comfort", (470, 55, 15, 20), [
    ("Turkey mince", 400, "g", MF, 2.70), ("Eggs", 1, "whole", DE, 0.25), ("Italian hard cheese", 20, "g", DE, 0.40),
    ("Passata", 300, "g", TJ, 0.35), ("Courgettes", 3, "whole", FV, 1.35), ("Garlic", 1, "clove", FV, 0.10)], [
    "Heat the oven to 200°C (180°C fan). Mix the mince, egg and grated cheese and roll into 12 balls. Bake for 15 minutes.",
    "Warm the passata with the garlic, add the meatballs and simmer for 10 minutes.",
    "Fry the spiralised courgettes for 2 minutes and serve with the meatballs."], of="s-turkey-meatballs-in-tomato-sauce")
add("dinner", "Pesto chicken traybake with green veg", 35, ["Oven"], ["gluten-free", "high-protein"], "Comfort", (500, 50, 9, 28), [
    ("Chicken thighs (boneless)", 400, "g", MF, 2.60), ("Cherry tomatoes", 200, "g", FV, 0.90), ("Green pesto", 2, "tbsp", TJ, 0.40),
    ("Green beans", 150, "g", FV, 0.80), ("Courgettes", 1, "whole", FV, 0.45)], [
    "Heat the oven to 200°C (180°C fan). Toss the chicken in the pesto and roast for 15 minutes.",
    "Add the tomatoes, beans and sliced courgette and roast for 15 more minutes."], of="s-pesto-chicken-traybake")
add("dinner", "Cottage pie with cauliflower mash", 60, ["Oven", "Hob"], ["gluten-free", "high-protein"], "Comfort", (520, 53, 16, 27), [
    ("Beef mince (5% fat)", 400, "g", MF, 3.20), ("Cauliflower", 1, "whole", FV, 1.00), ("Onion", 1, "whole", FV, 0.15),
    ("Carrot", 1, "whole", FV, 0.10), ("Beef stock cube", 1, "whole", SC, 0.10), ("Worcestershire sauce", 1, "tbsp", TJ, 0.10),
    ("Mature cheddar", 40, "g", DE, 0.40), ("Butter", 15, "g", DE, 0.15)], [
    "Heat the oven to 200°C (180°C fan). Boil the cauliflower florets for 10 minutes, drain well and mash with the butter.",
    "Brown the mince with the chopped onion and carrot. Add the stock cube, Worcestershire sauce and 150ml water and simmer for 15 minutes.",
    "Spoon into a dish, top with the mash and cheese, and bake for 20 minutes."], of="s-cottage-pie")
add("dinner", "Chicken & mushroom stroganoff with cauliflower rice", 25, ["Hob"], ["gluten-free", "high-protein"], "Comfort", (460, 57, 13, 18), [
    ("Chicken breast", 400, "g", MF, 3.20), ("Mushrooms", 300, "g", FV, 1.05), ("Half-fat crème fraîche", 150, "ml", DE, 0.80),
    ("Smoked paprika", 1, "tsp", HS, 0.10), ("Onion", 1, "whole", FV, 0.15), ("Frozen cauliflower rice", 400, "g", FZ, 1.25)], [
    "Fry the sliced chicken until golden, then lift out.",
    "Soften the onion, add the mushrooms and cook on a high heat until browned. Add the paprika.",
    "Return the chicken with the crème fraîche and a splash of water and bubble for 3 minutes. Serve with the cauliflower rice."], of="s-mushroom-stroganoff")
add("dinner", "Sausage & pepper casserole", 40, ["Hob"], ["pork", "gluten-free", "dairy-free"], "Comfort", (470, 27, 17, 32), [
    ("97% pork sausages", 6, "whole", MF, 2.75), ("Chopped tomatoes", 1, "tin", TJ, 0.40), ("Peppers", 1, "whole", FV, 0.50),
    ("Courgettes", 1, "whole", FV, 0.45), ("Onion", 1, "whole", FV, 0.15), ("Smoked paprika", 1, "tsp", HS, 0.10)], [
    "Brown the sausages, then lift out and halve.",
    "Soften the sliced onion, pepper and courgette for 6 minutes. Add the paprika.",
    "Return the sausages with the tomatoes and simmer for 20 minutes. High-meat sausages keep the carbs low."], of="s-sausage-butter-bean-casserole")
add("dinner", "Soy & garlic salmon with greens", 20, ["Air fryer", "Hob"], ["fish", "dairy-free", "high-protein"], "Light", (450, 34, 6, 31), [
    ("Salmon fillets", 2, "whole", MF, 3.50), ("Tenderstem broccoli", 200, "g", FV, 1.50), ("Pak choi", 200, "g", FV, 1.00),
    ("Soy sauce", 2, "tbsp", WF, 0.15), ("Garlic", 1, "clove", FV, 0.10), ("Sesame oil", 1, "tbsp", WF, 0.20)], [
    "Brush the salmon with half the soy sauce and the grated garlic.",
    "Air fry at 190°C for 10–12 minutes.",
    "Stir-fry the broccoli and pak choi in the sesame oil with the rest of the soy sauce and serve with the salmon."], of="s-honey-soy-salmon-with-rice")

# ---------------- snacks ----------------
add("snack", "Skyr & peanut butter pot", 2, [], ["vegetarian", "gluten-free", "high-protein"], "Quick", (210, 21, 10, 9), [
    ("Skyr", 300, "g", DE, 1.00), ("Peanut butter", 2, "tbsp", SC, 0.20), ("Raspberries", 100, "g", FV, 1.00)], [
    "Spoon the skyr into two pots.", "Swirl through the peanut butter and top with raspberries."])
add("snack", "Ham & cheese roll-ups", 3, [], ["gluten-free", "high-protein"], "Quick", (170, 15, 1, 12), [
    ("Cooked ham slices", 100, "g", CH, 1.10), ("Mature cheddar", 50, "g", DE, 0.50)], [
    "Cut the cheese into sticks.", "Roll each stick in a slice of ham."])
add("snack", "Almonds", 1, [], ["vegetarian", "vegan", "gluten-free", "dairy-free"], "Quick", (150, 5, 2, 13), [
    ("Almonds", 50, "g", SC, 0.75)], ["Portion out 25g each. A small handful."])
add("snack", "Cottage cheese & cucumber", 3, [], ["vegetarian", "gluten-free", "high-protein"], "Quick", (165, 17, 6, 7), [
    ("Cottage cheese", 300, "g", DE, 1.10), ("Cucumber", 1, "whole", FV, 0.60)], [
    "Cut half the cucumber into thick slices.", "Top each slice with cottage cheese and black pepper."])

# ---------------- energy top-ups ----------------
# Low-carb meals need more fat to reach a 1,800 kcal day. Each entry changes ingredient
# quantities for 2 servings and adds the per-serving macro difference (kcal, protein, carbs, fat).
BOOST = {
    "Spinach & feta omelette": ([("add", ("Mature cheddar", 40, "g", DE, 0.40))], (83, 5, 0, 7)),
    "Greek yoghurt, berry & almond bowl": ([("set", "Flaked almonds", 80, 1.20)], (90, 3, 1, 8)),
    "Bacon, eggs & mushrooms": ([("set", "Eggs", 6, 1.50)], (72, 6, 0, 5)),
    "Chicken Caesar salad": ([("set", "Olive oil", 2, 0.20)], (60, 0, 0, 7)),
    "Tuna Niçoise salad": ([("set", "Olive oil", 3, 0.30)], (60, 0, 0, 7)),
    "Greek salad with chicken": ([("set", "Olive oil", 2, 0.20), ("set", "Feta", 150, 1.50)], (128, 4, 0, 12)),
    "Prawn & avocado salad": ([("set", "Avocado", 2, 1.50)], (120, 1, 1, 11)),
    "Turkey & cheese lettuce wraps": ([("set", "Mature cheddar", 100, 1.00), ("set", "Mayonnaise", 2, 0.20)], (133, 5, 0, 12)),
    "Chicken pesto courgetti": ([("set", "Chicken breast", 300, 2.40), ("set", "Green pesto", 4, 0.80)], (62, 6, 0, 4)),
    "Lemon & garlic chicken thighs with greens": ([("set", "Chicken thighs (boneless)", 500, 3.25), ("set", "Olive oil", 3, 0.30)], (148, 12, 0, 11)),
    "Burger bowl": ([("set", "Mature cheddar", 80, 0.80)], (83, 5, 0, 7)),
    "Garlic butter salmon with spinach": ([("set", "Butter", 40, 0.40)], (55, 0, 0, 6)),
    "Pork chops with mustard cream & cabbage": ([("set", "Butter", 30, 0.30)], (55, 0, 0, 6)),
    "Cod with chorizo & tomatoes": ([("set", "Chorizo", 120, 2.10), ("set", "Olive oil", 2, 0.20)], (172, 6, 0, 16)),
    "Bolognese with courgetti": ([("set", "Mature cheddar", 80, 0.80), ("add", ("Olive oil", 1, "tbsp", SC, 0.10))], (164, 6, 0, 15)),
    "Beef chilli with cauliflower rice": ([("set", "Soured cream", 150, 0.90), ("add", ("Mature cheddar", 40, "g", DE, 0.40))], (153, 6, 2, 14)),
    "Prawn egg-fried cauliflower rice": ([("set", "King prawns", 350, 5.80), ("set", "Sesame oil", 2, 0.40), ("set", "Eggs", 6, 1.50)], (166, 14, 0, 12)),
    "Turkey meatballs with courgetti": ([("set", "Italian hard cheese", 50, 1.00), ("add", ("Olive oil", 1, "tbsp", SC, 0.10))], (120, 5, 0, 11)),
    "Pesto chicken traybake with green veg": ([("set", "Green pesto", 4, 0.80)], (70, 1, 1, 7)),
    "Cottage pie with cauliflower mash": ([("set", "Mature cheddar", 80, 0.80)], (83, 5, 0, 7)),
    "Chicken & mushroom stroganoff with cauliflower rice": ([("set", "Half-fat crème fraîche", 250, 1.35), ("add", ("Butter", 15, "g", DE, 0.15))], (135, 2, 2, 14)),
    "Soy & garlic salmon with greens": ([("set", "Sesame oil", 2, 0.40)], (60, 0, 0, 7)),
}
for r in R:
    if r["name"] not in BOOST: continue
    changes, (dk, dp, dc, df) = BOOST.pop(r["name"])
    for ch in changes:
        if ch[0] == "set":
            ing = next(i for i in r["ingredients"] if i["name"] == ch[1]); ing["qty"], ing["cost"] = ch[2], ch[3]
        else:
            a, b, u, s, co = ch[1]; r["ingredients"].append({"name": a, "qty": b, "unit": u, "aisle": s, "cost": co})
    m = r["macros"]; m["kcal"] += dk; m["protein"] += dp; m["carbs"] += dc; m["fat"] += df
assert not BOOST, f"unmatched: {list(BOOST)}"

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]
for r in R:
    r["id"] = "lc-" + slug(r["name"])
json.dump(R, open(os.path.join(ROOT, "src/recipes-lowcarb.json"), "w"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(R), "low-carb recipes:", dict(Counter(r["meal"] for r in R)), "| versions:", sum(1 for r in R if r.get("lowCarbOf")))
