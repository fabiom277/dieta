// --- APP UI STATE E LOGICA ---

let appState = {
    user: null, 
    plan: [] 
};

const navDashboard = document.getElementById('nav-dashboard');
const navShopping = document.getElementById('nav-shopping');
const viewOnboarding = document.getElementById('view-onboarding');
const viewDashboard = document.getElementById('view-dashboard');
const viewShopping = document.getElementById('view-shopping');
const mainNav = document.getElementById('main-nav');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Controlla se c'è un piano nell'URL (Sincronizzazione)
    const urlParams = new URLSearchParams(window.location.search);
    const sharedPlan = urlParams.get('p');
    
    if (sharedPlan) {
        try {
            // Decodifica il piano base64
            const decoded = JSON.parse(atob(sharedPlan));
            appState.user = decoded.user;
            appState.plan = hydratePlanFromIds(decoded.planIds);
            localStorage.setItem('nutriplan_state', JSON.stringify(appState));
            // Pulisci l'URL per estetica
            window.history.replaceState({}, document.title, window.location.pathname);
            showView('dashboard');
            return;
        } catch (e) {
            console.error("Link di condivisione non valido", e);
        }
    }

    // 2. Altrimenti carica da localStorage
    const savedState = localStorage.getItem('nutriplan_state');
    if (savedState) {
        appState = JSON.parse(savedState);
        // Assicurati che 'excluded' esista nei vecchi salvataggi
        appState.plan.forEach(day => {
            ['breakfast', 'snack', 'lunch'].forEach(t => {
                if (day.meals[t] && day.meals[t].excluded === undefined) {
                    day.meals[t].excluded = false;
                }
            });
        });
        showView('dashboard');
        renderDashboard();
    }
    setupEventListeners();
});

function setupEventListeners() {
    navDashboard.addEventListener('click', () => showView('dashboard'));
    navShopping.addEventListener('click', () => showView('shopping'));
    document.getElementById('onboarding-form').addEventListener('submit', handleOnboardingSubmit);
    
    // Modals
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.querySelector('.close-qr-modal').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.add('hidden');
    });
    
    // Condivisione
    document.getElementById('btn-share').addEventListener('click', generateShareLink);
    
    // Spesa
    document.getElementById('generate-shopping').addEventListener('click', generateShoppingList);
}

function showView(viewName) {
    viewOnboarding.classList.remove('active');
    viewDashboard.classList.remove('active');
    viewShopping.classList.remove('active');
    viewOnboarding.classList.add('hidden');
    viewDashboard.classList.add('hidden');
    viewShopping.classList.add('hidden');

    navDashboard.classList.remove('active');
    navShopping.classList.remove('active');

    if (viewName === 'onboarding') {
        viewOnboarding.classList.remove('hidden');
        viewOnboarding.classList.add('active');
        mainNav.classList.add('hidden');
    } else if (viewName === 'dashboard') {
        viewDashboard.classList.remove('hidden');
        viewDashboard.classList.add('active');
        navDashboard.classList.add('active');
        mainNav.classList.remove('hidden');
        renderDashboard();
    } else if (viewName === 'shopping') {
        viewShopping.classList.remove('hidden');
        viewShopping.classList.add('active');
        navShopping.classList.add('active');
        mainNav.classList.remove('hidden');
    }
}

function handleOnboardingSubmit(e) {
    e.preventDefault();
    
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseInt(document.getElementById('height').value);
    const activity = parseFloat(document.getElementById('activity').value);
    const goal = document.getElementById('goal').value;
    const dislikes = document.getElementById('dislikes').value;

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activity);
    const targetCalories = calculateTargetCalories(tdee, goal);

    appState.user = {
        age, gender, weight, height, activity, goal, dislikes, targetCalories
    };

    appState.plan = generateMonthlyPlan(targetCalories, dislikes);
    
    // Inizializza stato 'excluded'
    appState.plan.forEach(day => {
        if(day.meals.breakfast) day.meals.breakfast.excluded = false;
        if(day.meals.snack) day.meals.snack.excluded = false;
        if(day.meals.lunch) day.meals.lunch.excluded = false;
    });

    localStorage.setItem('nutriplan_state', JSON.stringify(appState));

    document.getElementById('caloric-info').innerHTML = `Fabbisogno calcolato: <span class="highlight">${targetCalories} kcal</span>/giorno`;
    showView('dashboard');
}

function renderDashboard() {
    if (!appState.user) return;

    document.getElementById('caloric-info').innerHTML = `Fabbisogno calcolato: <span class="highlight">${appState.user.targetCalories} kcal</span>/giorno`;

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    appState.plan.forEach(dayPlan => {
        let totalCals = 0;
        if (!dayPlan.meals.breakfast.excluded) totalCals += dayPlan.meals.breakfast.calories;
        if (!dayPlan.meals.lunch.excluded) totalCals += dayPlan.meals.lunch.calories;
        if (dayPlan.meals.snack && !dayPlan.meals.snack.excluded) totalCals += dayPlan.meals.snack.calories;

        const card = document.createElement('div');
        card.className = 'day-card';
        
        let mealsHtml = renderMealSlot(dayPlan.day, 'breakfast', dayPlan.meals.breakfast);
        if (dayPlan.meals.snack) {
            mealsHtml += renderMealSlot(dayPlan.day, 'snack', dayPlan.meals.snack);
        }
        mealsHtml += renderMealSlot(dayPlan.day, 'lunch', dayPlan.meals.lunch);

        card.innerHTML = `
            <div class="day-header">
                <h3>Giorno ${dayPlan.day}</h3>
                <span class="day-kcal">${totalCals} kcal <span style="font-size:0.7em; font-weight:normal;">effettive</span></span>
            </div>
            ${mealsHtml}
        `;
        grid.appendChild(card);
    });

    // Event listeners bottoni
    document.querySelectorAll('.btn-view-meal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = parseInt(e.target.dataset.day);
            const type = e.target.dataset.type;
            openMealDetails(day, type);
        });
    });

    document.querySelectorAll('.btn-swap').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const day = parseInt(e.target.dataset.day);
            const type = e.target.dataset.type;
            swapMeal(day, type);
        });
    });

    // Event listener checkbox esclusione
    document.querySelectorAll('.exclude-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const day = parseInt(e.target.dataset.day);
            const type = e.target.dataset.type;
            const isExcluded = !e.target.checked; // se NON è checked, è excluded
            
            const dayPlanIndex = appState.plan.findIndex(p => p.day === day);
            appState.plan[dayPlanIndex].meals[type].excluded = isExcluded;
            
            localStorage.setItem('nutriplan_state', JSON.stringify(appState));
            renderDashboard(); // Ricarica per aggiornare le calorie e l'opacità
        });
    });
}

function renderMealSlot(dayIndex, mealType, meal) {
    let typeLabel = 'Pasto';
    if (mealType === 'breakfast') typeLabel = 'Colazione';
    else if (mealType === 'lunch') typeLabel = 'Pranzo';
    else if (mealType === 'snack') typeLabel = 'Spuntino';

    const excludedClass = meal.excluded ? 'excluded' : '';
    const checkedAttr = meal.excluded ? '' : 'checked';

    return `
        <div class="meal-slot ${excludedClass}">
            <div class="meal-type">
                <span>${typeLabel}</span>
                <span>${meal.calories} kcal</span>
            </div>
            <div class="meal-name">${meal.name}</div>
            <div class="meal-macros">
                <span>P: ${meal.macros.protein}g</span>
                <span>C: ${meal.macros.carbs}g</span>
                <span>G: ${meal.macros.fat}g</span>
            </div>
            <div class="meal-toggle">
                <input type="checkbox" class="exclude-checkbox" data-day="${dayIndex}" data-type="${mealType}" ${checkedAttr}>
                <label>Includi Pasto</label>
            </div>
            <div class="meal-actions">
                <button class="btn-small btn-view-meal" data-day="${dayIndex}" data-type="${mealType}">Ricetta</button>
                <button class="btn-small btn-swap" data-day="${dayIndex}" data-type="${mealType}">Cambia</button>
            </div>
        </div>
    `;
}

function openMealDetails(dayIndex, mealType) {
    const dayPlan = appState.plan.find(p => p.day === dayIndex);
    const meal = dayPlan.meals[mealType];
    
    let typeLabel = 'Pasto';
    if (mealType === 'breakfast') typeLabel = 'Colazione';
    else if (mealType === 'lunch') typeLabel = 'Pranzo';
    else if (mealType === 'snack') typeLabel = 'Spuntino';

    let html = `
        <div class="meal-type">Dieta Mediterranea - ${typeLabel} - Giorno ${dayIndex}</div>
        <h2>${meal.name}</h2>
    `;

    if (meal.imageUrl) {
        html += `
            <div style="margin: 1rem 0; border-radius: 12px; overflow: hidden; height: 200px;">
                <img src="${meal.imageUrl}" alt="${meal.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
        `;
    }

    html += `
        <div class="meal-macros" style="margin-bottom: 1.5rem; font-size: 0.9rem;">
            <span><strong>${meal.calories} kcal</strong></span>
            <span>Proteine: ${meal.macros.protein}g</span>
            <span>Carboidrati: ${meal.macros.carbs}g</span>
            <span>Grassi: ${meal.macros.fat}g</span>
        </div>
        
        <div class="recipe-prep">
            <h4>Ingredienti</h4>
            <ul>
                ${meal.ingredients.map(ing => `<li>${ing.amount}${ing.unit} ${ing.name}</li>`).join('')}
            </ul>
        </div>

        <div class="recipe-prep">
            <h4>Preparazione</h4>
            <ol>
                ${meal.instructions.map(step => `<li>${step}</li>`).join('')}
            </ol>
        </div>
    `;

    if (meal.sourceUrl) {
        html += `
            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                <a href="${meal.sourceUrl}" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                    🔗 Vai alla Ricetta Originale
                </a>
            </div>
        `;
    }

    document.getElementById('meal-details').innerHTML = html;
    document.getElementById('meal-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('meal-modal').classList.add('hidden');
}

function swapMeal(dayIndex, mealType) {
    const dayPlanIndex = appState.plan.findIndex(p => p.day === dayIndex);
    const currentMeal = appState.plan[dayPlanIndex].meals[mealType];
    
    const alternative = findAlternativeMeal(currentMeal, appState.user.dislikes, currentMeal.calories);
    
    if (alternative) {
        alternative.excluded = false; // Reset exclusion
        const newMeal = { ...alternative, mealInstanceId: `d${dayIndex}-${mealType}-${Date.now()}` };
        appState.plan[dayPlanIndex].meals[mealType] = newMeal;
        localStorage.setItem('nutriplan_state', JSON.stringify(appState));
        renderDashboard();
    } else {
        alert("Nessuna alternativa trovata nel database.");
    }
}

// Shopping List (Interattiva e Filtrata)
function generateShoppingList() {
    const checkboxes = document.querySelectorAll('.day-checkbox:checked');
    const selectedDays = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (selectedDays.length === 0) {
        document.getElementById('shopping-list-content').innerHTML = '<p class="text-center text-muted">Seleziona almeno un giorno.</p>';
        return;
    }

    const daysToShop = appState.plan.filter(p => selectedDays.includes(p.day));
    const categories = {};

    daysToShop.forEach(dayPlan => {
        const processMeal = (meal) => {
            // Salta il pasto se l'utente lo ha escluso dalla dashboard!
            if (!meal || meal.excluded) return;
            
            meal.ingredients.forEach(ing => {
                const cat = ing.category || 'Altro';
                const key = ing.name;
                
                if (!categories[cat]) categories[cat] = {};
                
                if (!categories[cat][key]) {
                    categories[cat][key] = { name: ing.name, amount: 0, unit: ing.unit };
                }
                categories[cat][key].amount += ing.amount;
            });
        };
        processMeal(dayPlan.meals.breakfast);
        if (dayPlan.meals.snack) processMeal(dayPlan.meals.snack);
        processMeal(dayPlan.meals.lunch);
    });

    const contentDiv = document.getElementById('shopping-list-content');
    
    if (Object.keys(categories).length === 0) {
        contentDiv.innerHTML = '<p class="text-center text-muted">Nessun ingrediente trovato per i giorni selezionati (o tutti i pasti sono stati esclusi).</p>';
        return;
    }

    let html = `<h3 style="margin-bottom: 1.5rem; text-align: center;">Spesa per i Giorni: ${selectedDays.join(', ')}</h3>`;
    html += `<p class="text-center text-muted" style="margin-bottom:2rem; font-size:0.9rem;">Spunta gli ingredienti che hai già in dispensa.</p>`;

    const catIcons = { 'Ortofrutta': '🥬', 'Carne e Pesce': '🥩', 'Latticini': '🧀', 'Dispensa': '🥫', 'Panetteria': '🍞', 'Altro': '🛒' };

    Object.keys(categories).sort().forEach(cat => {
        const items = categories[cat];
        const icon = catIcons[cat] || '🛒';
        
        html += `
            <div class="category-section" style="margin-bottom: 2rem;">
                <h4 style="color: var(--accent-primary); border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                    ${icon} ${cat}
                </h4>
                <ul class="ingredient-list">
        `;

        Object.values(items).sort((a, b) => a.name.localeCompare(b.name)).forEach((item, index) => {
            const uid = `ing-${cat}-${index}`.replace(/\\s+/g, '-');
            html += `
                <li class="ingredient-item">
                    <div style="display:flex; align-items:center;">
                        <input type="checkbox" class="ingredient-checkbox" id="${uid}">
                        <label for="${uid}" style="font-weight: 500; cursor:pointer;">${item.name}</label>
                    </div>
                    <span class="ing-amount" style="color: var(--accent-primary);">${Math.round(item.amount)} ${item.unit}</span>
                </li>
            `;
        });

        html += `</ul></div>`;
    });

    contentDiv.innerHTML = html;

    // Logica per barrare gli ingredienti quando spuntati
    document.querySelectorAll('.ingredient-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const listItem = e.target.closest('.ingredient-item');
            if(e.target.checked) {
                listItem.classList.add('crossed');
            } else {
                listItem.classList.remove('crossed');
            }
        });
    });
}

// --- SINCRONIZZAZIONE URL / QR CODE ---

function generateShareLink() {
    // 1. Estrai una versione "leggera" del piano per l'URL (solo gli ID)
    const compressedPlan = appState.plan.map(day => {
        const d = { day: day.day, b: day.meals.breakfast.id, l: day.meals.lunch.id };
        if (day.meals.snack) d.s = day.meals.snack.id;
        return d;
    });

    const exportData = {
        user: appState.user,
        planIds: compressedPlan
    };

    // 2. Crea stringa base64
    const base64Str = btoa(JSON.stringify(exportData));
    
    // 3. Crea l'URL finale (indirizzo corrente + ?p=...)
    const baseUrl = window.location.href.split('?')[0];
    const shareUrl = \`\${baseUrl}?p=\${base64Str}\`;

    // 4. Mostra nel Modal
    document.getElementById('qrcode').innerHTML = ''; // pulisci precedente
    new QRCode(document.getElementById("qrcode"), {
        text: shareUrl,
        width: 200,
        height: 200,
        colorDark : "#0f172a",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });

    document.getElementById('share-link-text').textContent = shareUrl;
    document.getElementById('qr-modal').classList.remove('hidden');
}

// Ricostruisce il piano a partire dagli ID
function hydratePlanFromIds(planIds) {
    return planIds.map(day => {
        const breakfast = recipesDB.find(r => r.id === day.b);
        const lunch = recipesDB.find(r => r.id === day.l);
        const meals = {
            breakfast: { ...breakfast, mealInstanceId: `d\${day.day}-b`, excluded: false },
            lunch: { ...lunch, mealInstanceId: `d\${day.day}-l`, excluded: false }
        };
        
        if (day.s) {
            const snack = snacksDB.find(r => r.id === day.s);
            meals.snack = { ...snack, mealInstanceId: `d\${day.day}-s`, excluded: false };
        }

        return { day: day.day, meals: meals };
    });
}
