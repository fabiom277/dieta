// --- NUTRITION LOGIC ---

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

// --- OPTION C: Ricerca per similarità + Spuntini ---

// Mappa di sinonimi/categorie per filtrare in modo intelligente
const FOOD_CATEGORY_MAP = {
    'pesce':       ['salmone', 'orata', 'branzino', 'tonno', 'merluzzo', 'acciughe', 'alici', 'sgombro', 'dentice', 'spigola', 'trota', 'baccalà'],
    'crostacei':   ['gamberetti', 'gamberi', 'scampi', 'aragosta', 'astice', 'granchio'],
    'molluschi':   ['vongole', 'cozze', 'calamari', 'seppie', 'polpo', 'moscardini'],
    'frutti di mare': ['gamberetti', 'gamberi', 'vongole', 'cozze', 'seppie', 'scampi'],
    'carne':       ['manzo', 'maiale', 'pollo', 'tacchino', 'agnello', 'vitello', 'hamburger', 'salsiccia', 'pancetta'],
    'lattosio':    ['latte', 'burro', 'panna', 'ricotta', 'mozzarella', 'formaggio', 'parmigiano', 'yogurt', 'kefir'],
    'glutine':     ['pasta', 'pane', 'farina', 'semola', 'orzo', 'farro', 'cous cous', 'piadina', 'gnocchi'],
    'uova':        ['uova', 'uovo'],
    'frutta secca':['mandorle', 'noci', 'nocciole', 'pistacchi', 'arachidi', 'anacardi'],
};

function getSafeRecipes(dislikesStr, pool) {
    if (!dislikesStr || dislikesStr.trim() === '') return pool;

    const rawDislikes = dislikesStr.toLowerCase().split(',').map(d => d.trim()).filter(d => d.length > 0);

    // Espandi i sinonimi: se l'utente scrive "pesce" aggiunge anche salmone, orata, ecc.
    const expandedDislikes = new Set(rawDislikes);
    rawDislikes.forEach(d => {
        if (FOOD_CATEGORY_MAP[d]) {
            FOOD_CATEGORY_MAP[d].forEach(synonym => expandedDislikes.add(synonym));
        }
    });
    const dislikes = Array.from(expandedDislikes);

    return pool.filter(recipe => {
        // 1. Controlla se il NOME della ricetta contiene una parola da escludere
        const nameContainsDislike = dislikes.some(d => recipe.name.toLowerCase().includes(d));
        if (nameContainsDislike) return false;

        // 2. Controlla se un INGREDIENTE contiene una parola da escludere
        const hasDislikedIngredient = recipe.ingredients.some(ing =>
            dislikes.some(d => ing.name.toLowerCase().includes(d))
        );
        if (hasDislikedIngredient) return false;

        // 3. Controlla i TAG della ricetta
        const hasDislikedTag = recipe.tags
            ? recipe.tags.some(tag => dislikes.includes(tag.toLowerCase()) || rawDislikes.includes(tag.toLowerCase()))
            : false;
        if (hasDislikedTag) return false;

        return true;
    });
}

/**
 * Cerca la ricetta più vicina al target calorico in porzione originale (senza moltiplicarla)
 */
function findClosestMeal(safePool, targetCals) {
    if (safePool.length === 0) return null;
    
    // Ordina in base alla vicinanza alle calorie target
    const sorted = [...safePool].sort((a, b) => {
        return Math.abs(a.baseCalories - targetCals) - Math.abs(b.baseCalories - targetCals);
    });

    // Seleziona una a caso tra le 3 migliori per dare varietà
    const topChoices = sorted.slice(0, 3);
    const chosen = topChoices[Math.floor(Math.random() * topChoices.length)];
    
    // Mappa per uniformare la struttura che app.js si aspetta (usa baseCalories per i render)
    const meal = JSON.parse(JSON.stringify(chosen));
    meal.calories = meal.baseCalories;
    return meal;
}

function generateMonthlyPlan(targetCalories, dislikesStr) {
    const plan = [];
    const daysInPlan = 7; // Solo 1 settimana
    
    const safeBreakfasts = getSafeRecipes(dislikesStr, recipesDB.filter(r => r.type === 'breakfast'));
    const safeLunches = getSafeRecipes(dislikesStr, recipesDB.filter(r => r.type === 'lunch'));
    const safeSnacks = getSafeRecipes(dislikesStr, snacksDB);

    // Se l'utente ha escluso troppo, fallback
    const bPool = safeBreakfasts.length > 0 ? safeBreakfasts : recipesDB.filter(r => r.type === 'breakfast');
    const lPool = safeLunches.length > 0 ? safeLunches : recipesDB.filter(r => r.type === 'lunch');
    const sPool = safeSnacks.length > 0 ? safeSnacks : snacksDB;

    // Distribuzione approssimativa: 30% colazione, 55% pranzo, 15% spuntino
    const targetBreakfastCals = targetCalories * 0.30;
    const targetLunchCals = targetCalories * 0.55;

    for (let day = 1; day <= daysInPlan; day++) {
        const breakfast = findClosestMeal(bPool, targetBreakfastCals);
        const lunch = findClosestMeal(lPool, targetLunchCals);

        // Calcola il deficit (gap) rimanente
        const currentCals = breakfast.calories + lunch.calories;
        const remainingCals = targetCalories - currentCals;

        // Cerca lo spuntino che meglio copre il gap
        let snack = null;
        if (remainingCals > 50) { // Se mancano almeno 50 kcal, aggiungi spuntino
            snack = findClosestMeal(sPool, remainingCals);
        }

        const dailyMeals = {
            breakfast: { ...breakfast, mealInstanceId: `d${day}-b` },
            lunch: { ...lunch, mealInstanceId: `d${day}-l` }
        };

        if (snack) {
            dailyMeals.snack = { ...snack, mealInstanceId: `d${day}-s` };
        }

        plan.push({
            day: day,
            meals: dailyMeals
        });
    }

    return plan;
}

function findAlternativeMeal(currentMeal, dislikesStr, targetCaloriesForThatMeal) {
    // Cerchiamo una ricetta che sostituisca quella attuale cercando di stare vicina alle SUE vecchie calorie
    // per non alterare troppo il bilancio totale
    let pool = recipesDB.filter(r => r.type === currentMeal.type && r.id !== currentMeal.id);
    if (currentMeal.type === 'snack') {
        pool = snacksDB.filter(s => s.id !== currentMeal.id);
    }
    
    const safePool = getSafeRecipes(dislikesStr, pool);
    const finalPool = safePool.length > 0 ? safePool : pool;
    
    return findClosestMeal(finalPool, currentMeal.calories);
}
