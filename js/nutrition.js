// Global recipe pools (populated from Supabase)
let recipesDB = [];
let snacksDB = [];

// Esporta globalmente per visibilità tra script
window.recipesDB = recipesDB;
window.snacksDB = snacksDB;
window.calculateBMI = calculateBMI;
window.calculateBMR = calculateBMR;
window.calculateTDEE = calculateTDEE;
window.calculateTargetCalories = calculateTargetCalories;
window.generateMonthlyPlan = generateMonthlyPlan;
window.findAlternativeMeal = findAlternativeMeal;
window.getTodayISO = getTodayISO;

function getTodayISO() {
    return new Date().toISOString().slice(0, 10);
}

function calculateBMI(weight, heightCm) {
    const heightM = heightCm / 100;
    const bmi = weight / (heightM * heightM);
    let category = '';
    if (bmi < 18.5) category = 'Sottopeso';
    else if (bmi < 25) category = 'Normopeso';
    else if (bmi < 30) category = 'Sovrappeso';
    else category = 'Obesità';
    return { bmi: bmi.toFixed(1), category };
}

function calculateBMR(weight, heightCm, age, gender) {
    let bmr = (10 * weight) + (6.25 * heightCm) - (5 * age);
    if (gender === 'male') bmr += 5;
    else bmr -= 161;
    return bmr;
}

function calculateTDEE(bmr, activityLevel) {
    return bmr * activityLevel;
}

function calculateTargetCalories(tdee, goal) {
    switch (goal) {
        case 'lose': return Math.round(tdee - 500);
        case 'gain': return Math.round(tdee + 300);
        case 'maintain':
        default: return Math.round(tdee);
    }
}

// --- SMART ADDITIONS DB ---
const SMART_ADDITIONS = [
    { name: "Noci o Mandorle", amount: 20, unit: "g", cals: 130, types: ['breakfast', 'snack', 'lunch', 'dinner'] },
    { name: "Pane Integrale", amount: 50, unit: "g", cals: 125, types: ['lunch', 'dinner', 'breakfast'] },
    { name: "Olio Extravergine (aggiunto)", amount: 10, unit: "g", cals: 90, types: ['lunch', 'dinner'] },
    { name: "Un Frutto (Mela/Pera)", amount: 1, unit: "pz", cals: 80, types: ['snack', 'breakfast', 'lunch'] },
    { name: "Parmigiano Reggiano", amount: 15, unit: "g", cals: 60, types: ['lunch', 'dinner'] },
    { name: "Cioccolato Fondente 85%", amount: 10, unit: "g", cals: 60, types: ['snack', 'dinner'] }
];

function getSmartAddition(gap, type) {
    if (gap < 50) return null;
    const pool = SMART_ADDITIONS.filter(a => a.types.includes(type));
    // Trova l'aggiunta che copre meglio il gap senza superarlo troppo
    const sorted = [...pool].sort((a, b) => Math.abs(a.cals - gap) - Math.abs(b.cals - gap));
    return sorted[0] || null;
}

/**
 * Filtra le ricette per dieta (veg/vegan), dislikes e banned
 */
function getSafeRecipes(profile, pool) {
    const { diet_type, dislikes: dislikesStr, bannedRecipeIds } = profile;
    const banned = bannedRecipeIds || [];

    let filtered = pool.filter(r => r && !banned.includes(r.id));

    // Filtro Dieta
    if (diet_type === 'vegetarian') {
        filtered = filtered.filter(r => r.is_vegetarian);
    } else if (diet_type === 'vegan') {
        filtered = filtered.filter(r => r.is_vegan);
    }

    // Filtro Dislikes
    if (!dislikesStr) return filtered;
    
    let dislikes = [];
    if (Array.isArray(dislikesStr)) {
        dislikes = dislikesStr.map(d => d.toLowerCase().trim());
    } else if (typeof dislikesStr === 'string' && dislikesStr.trim() !== '') {
        dislikes = dislikesStr.toLowerCase().split(',').map(d => d.trim()).filter(d => d.length > 0);
    } else {
        return filtered;
    }
    
    return filtered.filter(recipe => {
        const nameMatch = dislikes.some(d => recipe.name.toLowerCase().includes(d));
        if (nameMatch) return false;
        if (recipe.ingredients) {
            const ingMatch = recipe.ingredients.some(ing => dislikes.some(d => ing.name.toLowerCase().includes(d)));
            if (ingMatch) return false;
        }
        return true;
    });
}

function findClosestMeal(safePool, targetCals, avoidIds = []) {
    if (safePool.length === 0) return null;
    let filteredPool = safePool.filter(r => r && !avoidIds.includes(r.id));
    const finalPool = filteredPool.length > 0 ? filteredPool : safePool;

    const sorted = [...finalPool].sort((a, b) => Math.abs(a.base_calories - targetCals) - Math.abs(b.base_calories - targetCals));
    const chosen = sorted[Math.floor(Math.random() * Math.min(sorted.length, 3))];
    
    if (!chosen) return null;
    const meal = JSON.parse(JSON.stringify(chosen));
    meal.calories = meal.base_calories;
    
    // Smart Scaling (Max 1.2x)
    if (targetCals > meal.calories * 1.1) {
        meal.portion = Math.min(1.2, targetCals / meal.calories);
        meal.calories = Math.round(meal.calories * meal.portion);
    } else {
        meal.portion = 1.0;
    }

    return meal;
}

function generateSingleDay(profile, avoidIds = []) {
    const { targetCalories, eating_pattern } = profile;
    const todayStr = getTodayISO();

    // Distribuzione calorie
    let dist = { breakfast: 0.20, snack: 0.10, lunch: 0.40, dinner: 0.30 };
    let skip = [];

    if (eating_pattern === 'if_morning') {
        dist = { breakfast: 0.45, lunch: 0.45, snack: 0.10, dinner: 0 };
        skip = ['dinner'];
    } else if (eating_pattern === 'if_evening') {
        dist = { breakfast: 0, lunch: 0.45, snack: 0.10, dinner: 0.45 };
        skip = ['breakfast'];
    }

    const meals = {};
    const slots = ['breakfast', 'snack', 'lunch', 'dinner'];

    slots.forEach(slot => {
        if (skip.includes(slot)) return;

        const target = targetCalories * dist[slot];
        if (target <= 0) return;

        let pool = (slot === 'snack') ? snacksDB : recipesDB.filter(r => r.type === slot);
        // Fallback: se non ci sono ricette specifiche per cena, usa quelle da pranzo
        if (slot === 'dinner' && pool.length === 0) pool = recipesDB.filter(r => r.type === 'lunch');
        
        const safePool = getSafeRecipes(profile, pool);
        const meal = findClosestMeal(safePool, target, avoidIds);
        
        if (meal) {
            meal.excluded = false;
            // Aggiunta Intelligente se deficit ancora alto
            const gap = target - meal.calories;
            const addition = getSmartAddition(gap, slot);
            if (addition) {
                meal.smartAddition = addition;
                meal.calories += addition.cals;
            }
            meals[slot] = meal;
        }
    });

    return { meals };
}

function generateMonthlyPlan(profile) {
    const plan = [];
    const today = getTodayISO();
    const usedIds = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);

        const dayPlan = generateSingleDay(profile, usedIds);
        dayPlan.date = dateStr;
        dayPlan.confirmed = false;

        Object.keys(dayPlan.meals).forEach(slot => {
            const m = dayPlan.meals[slot];
            m.mealInstanceId = `${dateStr}-${slot}`;
            usedIds.push(m.id);
        });

        plan.push(dayPlan);
    }
    return plan;
}

function findAlternativeMeal(currentMeal, profile, targetCals, avoidIds = []) {
    let pool = (currentMeal.type === 'snack') ? snacksDB : recipesDB.filter(r => r.type === currentMeal.type);
    if (currentMeal.type === 'dinner' && recipesDB.filter(r => r.type === 'dinner').length === 0) {
        pool = recipesDB.filter(r => r.type === 'lunch');
    }
    const safePool = getSafeRecipes(profile, pool.filter(r => r.id !== currentMeal.id));
    return findClosestMeal(safePool, targetCals, avoidIds);
}
