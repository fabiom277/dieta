// --- NUTRITION LOGIC ---

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

// --- FOOD CATEGORY MAP ---
const FOOD_CATEGORY_MAP = {
    'pesce':          ['salmone', 'orata', 'branzino', 'tonno', 'merluzzo', 'acciughe', 'alici', 'sgombro', 'dentice', 'spigola', 'trota', 'baccalà'],
    'crostacei':      ['gamberetti', 'gamberi', 'scampi', 'aragosta', 'astice', 'granchio'],
    'molluschi':      ['vongole', 'cozze', 'calamari', 'seppie', 'polpo', 'moscardini'],
    'frutti di mare': ['gamberetti', 'gamberi', 'vongole', 'cozze', 'seppie', 'scampi'],
    'carne':          ['manzo', 'maiale', 'pollo', 'tacchino', 'agnello', 'vitello', 'hamburger', 'salsiccia', 'pancetta'],
    'lattosio':       ['latte', 'burro', 'panna', 'ricotta', 'mozzarella', 'formaggio', 'parmigiano', 'yogurt', 'kefir'],
    'glutine':        ['pasta', 'pane', 'farina', 'semola', 'orzo', 'farro', 'cous cous', 'piadina', 'gnocchi'],
    'uova':           ['uova', 'uovo'],
    'frutta secca':   ['mandorle', 'noci', 'nocciole', 'pistacchi', 'arachidi', 'anacardi'],
};

/**
 * Filtra le ricette per dislikes e bannedRecipeIds
 */
function getSafeRecipes(dislikesStr, pool, bannedRecipeIds) {
    const banned = bannedRecipeIds || [];

    // Prima filtra le ricette bannate dall'utente
    let filtered = pool.filter(r => !banned.includes(r.id));

    if (!dislikesStr || dislikesStr.trim() === '') return filtered;

    const rawDislikes = dislikesStr.toLowerCase().split(',').map(d => d.trim()).filter(d => d.length > 0);
    const expandedDislikes = new Set(rawDislikes);
    rawDislikes.forEach(d => {
        if (FOOD_CATEGORY_MAP[d]) {
            FOOD_CATEGORY_MAP[d].forEach(synonym => expandedDislikes.add(synonym));
        }
    });
    const dislikes = Array.from(expandedDislikes);

    return filtered.filter(recipe => {
        const nameContainsDislike = dislikes.some(d => recipe.name.toLowerCase().includes(d));
        if (nameContainsDislike) return false;
        const hasDislikedIngredient = recipe.ingredients.some(ing =>
            dislikes.some(d => ing.name.toLowerCase().includes(d))
        );
        if (hasDislikedIngredient) return false;
        const hasDislikedTag = recipe.tags
            ? recipe.tags.some(tag => dislikes.includes(tag.toLowerCase()) || rawDislikes.includes(tag.toLowerCase()))
            : false;
        if (hasDislikedTag) return false;
        return true;
    });
}

/**
 * Trova la ricetta più vicina al target calorico, evitando avoidIds
 */
function findClosestMeal(safePool, targetCals, avoidIds = []) {
    if (safePool.length === 0) return null;
    
    // Filtra ulteriormente per evitare ricette in avoidIds
    let filteredPool = safePool.filter(r => !avoidIds.includes(r.id));
    
    // Se svuotiamo troppo il pool, torniamo a quello sicuro originale (fallback)
    const finalPool = filteredPool.length > 0 ? filteredPool : safePool;

    const sorted = [...finalPool].sort((a, b) =>
        Math.abs(a.baseCalories - targetCals) - Math.abs(b.baseCalories - targetCals)
    );
    const topChoices = sorted.slice(0, 3);
    const chosen = topChoices[Math.floor(Math.random() * topChoices.length)];
    const meal = JSON.parse(JSON.stringify(chosen));
    meal.calories = meal.baseCalories;
    return meal;
}

/**
 * Genera un singolo giorno di pasti (senza assegnare la data)
 */
function generateSingleDay(targetCalories, dislikesStr, bannedRecipeIds, avoidIds = []) {
    const banned = bannedRecipeIds || [];
    const safeBreakfasts = getSafeRecipes(dislikesStr, recipesDB.filter(r => r.type === 'breakfast'), banned);
    const safeLunches    = getSafeRecipes(dislikesStr, recipesDB.filter(r => r.type === 'lunch'), banned);
    const safeSnacks     = getSafeRecipes(dislikesStr, snacksDB, banned);

    const bPool = safeBreakfasts.length > 0 ? safeBreakfasts : recipesDB.filter(r => r.type === 'breakfast');
    const lPool = safeLunches.length > 0    ? safeLunches    : recipesDB.filter(r => r.type === 'lunch');
    const sPool = safeSnacks.length > 0     ? safeSnacks     : snacksDB;

    const targetBreakfastCals = targetCalories * 0.30;
    const targetLunchCals     = targetCalories * 0.55;
    const targetSnackCals     = targetCalories * 0.15; // Target per spuntino

    const breakfast = findClosestMeal(bPool, targetBreakfastCals, avoidIds);
    const lunch     = findClosestMeal(lPool, targetLunchCals, avoidIds);

    const currentCals   = breakfast.calories + lunch.calories;
    const remainingCals = targetCalories - currentCals;

    let snack = null;
    if (remainingCals > 50) {
        snack = findClosestMeal(sPool, remainingCals, avoidIds);
    }

    breakfast.excluded = false;
    lunch.excluded     = false;

    const meals = {
        breakfast: { ...breakfast },
        lunch:     { ...lunch }
    };
    if (snack) {
        snack.excluded = false;
        meals.snack = { ...snack };
    }

    return { meals };
}

/**
 * Genera un piano settimanale (usato solo per rigenerazione completa)
 * Ora ritorna un array con struttura { date, meals } usando le prossime 7 date
 */
function generateMonthlyPlan(targetCalories, dislikesStr, bannedRecipeIds) {
    const plan = [];
    const banned = bannedRecipeIds || [];
    const today = getTodayISO();
    
    // Teniamo traccia degli ID usati in questa generazione per massimizzare la varietà
    const usedInPlanIds = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const y  = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        const date = `${y}-${mo}-${da}`;

        // Passiamo gli ID già usati per evitare ripetizioni nello stesso piano
        const dayPlan = generateSingleDay(targetCalories, dislikesStr, banned, usedInPlanIds);
        dayPlan.date = date;
        dayPlan.confirmed = false; // Nuovo stato per conferma

        const mealTypes = ['breakfast', 'snack', 'lunch'];
        mealTypes.forEach(t => {
            if (dayPlan.meals[t]) {
                dayPlan.meals[t].mealInstanceId = `${date}-${t}`;
                // Aggiungiamo ai usati
                usedInPlanIds.push(dayPlan.meals[t].id);
            }
        });

        plan.push(dayPlan);
    }
    return plan;
}

/**
 * Trova un'alternativa a un pasto, escludendo bannedRecipeIds e avoidIds
 */
function findAlternativeMeal(currentMeal, dislikesStr, targetCaloriesForThatMeal, bannedRecipeIds, avoidIds = []) {
    const banned = [...bannedRecipeIds, ...(avoidIds || [])];
    let pool = recipesDB.filter(r => r.type === currentMeal.type && r.id !== currentMeal.id);
    if (currentMeal.type === 'snack') {
        pool = snacksDB.filter(s => s.id !== currentMeal.id);
    }
    const safePool  = getSafeRecipes(dislikesStr, pool, banned);
    const finalPool = safePool.length > 0 ? safePool : pool;
    return findClosestMeal(finalPool, currentMeal.calories);
}
