/**
 * app.js - NutriPlan Premium v2.9
 * Logic for dashboard, calendar, profile and shopping list.
 */

let appState = {
    user: null,
    plan: [],
    recipes: []
};

let currentUser = null;

// ============================================================
// DOM ELEMENTS & UTILS
// ============================================================
function initDomRefs() {
    // Add any necessary direct DOM listeners here
    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) {
        onboardingForm.addEventListener('submit', handleOnboarding);
    }
}

function showLoader() {
    document.getElementById('global-loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('global-loader').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

// ============================================================
// NAVIGATION
// ============================================================
function showView(viewId) {
    const views = document.querySelectorAll('.view');
    views.forEach(v => v.classList.add('hidden'));

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Update nav state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(ni => ni.classList.remove('active'));
    const activeNav = document.getElementById(`nav-${viewId}`);
    if (activeNav) activeNav.classList.add('active');

    // Run specific view logic
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'profile') renderProfile();
    if (viewId === 'shopping') {
        setupShoppingDaysSelector();
        renderShoppingList(false);
    }
    if (viewId === 'calendar') renderMonthlyCalendar();
}

// ============================================================
// AUTH & DATA
// ============================================================
async function loginWithGithub() {
    showLoader();
    const { error } = await _supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) alert("Errore login: " + error.message);
}

async function logout() {
    await _supabase.auth.signOut();
    window.location.reload();
}

async function saveToCloud() {
    if (!currentUser) return;
    const { error } = await _supabase
        .from('user_profiles')
        .upsert({ 
            id: currentUser.id, 
            data: appState.user,
            plan: appState.plan,
            updated_at: new Date()
        });
    if (error) console.error("Cloud Save Error:", error);
}

async function loadFromCloud() {
    if (!currentUser) return false;
    const { data, error } = await _supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (data) {
        appState.user = data.data;
        appState.plan = data.plan || [];
        return true;
    }
    return false;
}

async function fetchRecipesFromSupabase() {
    const { data, error } = await _supabase
        .from('recipes_premium')
        .select('*');
    
    if (data) appState.recipes = data;
    else console.error("Fetch Recipes Error:", error);
}

// ============================================================
// CORE LOGIC: PLAN GENERATION
// ============================================================
async function handleOnboarding(e) {
    e.preventDefault();
    showLoader();

    const weight = parseFloat(document.getElementById('onb-weight').value);
    const height = parseInt(document.getElementById('onb-height').value);
    const age = parseInt(document.getElementById('onb-age').value);
    const gender = document.getElementById('onb-gender').value;
    const activity = parseFloat(document.getElementById('onb-activity').value);
    const goal = document.getElementById('onb-goal').value;
    const diet = document.getElementById('onb-diet').value;
    const dislikes = document.getElementById('onb-dislikes').value;

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activity);
    const targetCals = calculateTargetCalories(tdee, goal);
    const bmiInfo = calculateBMI(weight, height);

    appState.user = {
        weight, height, age, gender, activity_level: activity, goal, diet_type: diet, dislikes,
        targetCalories: targetCals,
        bmi: bmiInfo.bmi,
        bmiCategory: bmiInfo.category
    };

    appState.plan = generateMealPlan(targetCals, appState.recipes, diet, dislikes);
    
    await saveToCloud();
    hideLoader();
    showView('dashboard');
}

async function generateNewWeek() {
    if (!confirm("Vuoi rigenerare il piano per la prossima settimana?")) return;
    showLoader();
    appState.plan = generateMealPlan(appState.user.targetCalories, appState.recipes, appState.user.diet_type, appState.user.dislikes);
    await saveToCloud();
    renderDashboard();
    hideLoader();
}

function generateMealPlan(targetCals, allRecipes, dietType, dislikes) {
    const plan = [];
    const today = new Date();
    const dislikeList = dislikes ? dislikes.toLowerCase().split(',').map(s => s.trim()) : [];

    // Filtra ricette per dieta e esclusioni
    let pool = allRecipes;
    if (dietType !== 'standard') {
        pool = pool.filter(r => r.diet_type === dietType);
    }
    if (dislikeList.length > 0) {
        pool = pool.filter(r => {
            const content = (r.name + ' ' + JSON.stringify(r.ingredients)).toLowerCase();
            return !dislikeList.some(d => content.includes(d));
        });
    }

    if (pool.length < 5) {
        console.warn("Poche ricette trovate nel pool, uso tutte.");
        pool = allRecipes;
    }

    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayPlan = {
            date: dateStr,
            meals: {
                breakfast: getRandomMeal(pool, 'breakfast', targetCals * 0.2),
                lunch: getRandomMeal(pool, 'lunch', targetCals * 0.35),
                snack: getRandomMeal(pool, 'snack', targetCals * 0.1),
                dinner: getRandomMeal(pool, 'dinner', targetCals * 0.35)
            }
        };
        plan.push(dayPlan);
    }
    return plan;
}

function getRandomMeal(pool, type, target) {
    let typePool = pool.filter(r => r.category === type);
    if (typePool.length === 0) typePool = pool;
    
    const meal = { ...typePool[Math.floor(Math.random() * typePool.length)] };
    
    // Prova a calcolare una porzione approssimativa o aggiunta smart
    meal.portion = 1;
    const diff = target - meal.calories;
    
    if (diff > 100) {
        // Aggiunta automatica smart (pane, frutta, olio)
        if (type === 'lunch' || type === 'dinner') {
            meal.smartAddition = { name: "Pane integrale", amount: 50, unit: "g", calories: 120 };
        } else {
            meal.smartAddition = { name: "Frutta fresca", amount: 150, unit: "g", calories: 80 };
        }
    }
    
    meal.confirmed = false;
    return meal;
}

// ============================================================
// DASHBOARD RENDER
// ============================================================
function renderDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = `
            <div class="glass-panel text-center" style="padding: 4rem 2rem;">
                <div style="font-size: 4rem; margin-bottom: 1.5rem;">🍳</div>
                <h2 style="margin-bottom: 1rem;">Pronto per iniziare?</h2>
                <p style="color: var(--text-secondary); max-width: 500px; margin: 0 auto 2rem;">
                    Completa il tuo profilo per ricevere un piano alimentare personalizzato basato sui tuoi obiettivi.
                </p>
                <button class="btn btn-primary" onclick="showView('profile')">Configura Profilo</button>
            </div>
        `;
        return;
    }

    const today = getTodayISO();
    const weekPlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    let html = `<div class="weekly-grid">`;

    weekPlan.forEach((day, index) => {
        const dateObj = new Date(day.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'long' });
        const dayNum  = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
        const isToday = day.date === today;

        let consumed = 0;
        let target = appState.user.targetCalories;
        Object.values(day.meals).forEach(m => {
            if (m.confirmed) consumed += m.calories;
        });
        const progress = Math.min(100, (consumed / target) * 100);

        html += `
            <div class="day-section ${isToday ? 'is-today' : ''}" id="day-${day.date}">
                <div class="day-header-premium">
                    <div class="day-info">
                        ${isToday ? '<span class="today-badge">OGGI</span>' : ''}
                        <span class="day-name">${dayName}</span>
                        <span class="day-date">${dayNum}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 700;">
                            ${consumed} / ${target} <span style="font-size: 0.7rem;">KCAL</span>
                        </div>
                        <div class="daily-progress-container" style="width: 120px;">
                            <div class="daily-progress-bar" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
                <div class="meals-container-premium">
                    ${renderMealSlot(day.date, 'breakfast', day.meals.breakfast)}
                    ${renderMealSlot(day.date, 'lunch', day.meals.lunch)}
                    ${renderMealSlot(day.date, 'snack', day.meals.snack)}
                    ${renderMealSlot(day.date, 'dinner', day.meals.dinner)}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

function renderMealSlot(date, type, meal) {
    if (!meal) return '';
    const labels = { breakfast: 'Colazione', snack: 'Spuntino', lunch: 'Pranzo', dinner: 'Cena' };
    const icons  = { breakfast: '☕', lunch: '🍱', snack: '🍎', dinner: '🍽️' };
    
    return `
        <div class="meal-card-premium ${meal.confirmed ? 'is-confirmed' : ''}" onclick="openMealDetails('${date}', '${type}')">
            <div class="meal-card-header">
                <span class="meal-icon">${icons[type]}</span>
                <span class="meal-type-label">${labels[type]}</span>
                ${meal.confirmed ? '<span class="confirmed-check">✓</span>' : ''}
            </div>
            
            <h3 class="meal-title">${meal.name}</h3>
            
            ${meal.smartAddition ? `
                <div class="meal-smart-tag">
                    <span class="pulse-dot"></span>
                    <span style="font-weight:700;">+ ${meal.smartAddition.name}</span>
                </div>
            ` : '<div style="height:32px;"></div>'}
            
            <div class="meal-footer">
                <div class="meal-stats">
                    <span title="Calorie">🔥 ${Math.round(meal.calories)}</span>
                    <span title="Proteine">🥩 ${Math.round(meal.macros.protein * (meal.portion || 1))}g</span>
                </div>
                <div class="meal-actions">
                    <button class="action-btn swap" onclick="event.stopPropagation(); swapMeal('${date}', '${type}')" title="Cambia ricetta">🔄</button>
                    <button class="action-btn confirm ${meal.confirmed ? 'active' : ''}" onclick="event.stopPropagation(); confirmMeal('${date}', '${type}')" title="${meal.confirmed ? 'Annulla conferma' : 'Conferma pasto'}">
                        ${meal.confirmed ? 'Pasto Fatto' : 'Conferma'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// MEAL ACTIONS
// ============================================================
function openMealDetails(date, type) {
    const day = appState.plan.find(p => p.date === date);
    const meal = day.meals[type];
    const modalBody = document.getElementById('meal-modal-body');
    
    modalBody.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">${meal.category === 'lunch' ? '🍱' : '🍽️'}</div>
            <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem;">${meal.name}</h2>
            <p style="color: var(--text-secondary);">Categoria: ${meal.category}</p>
        </div>

        <div class="glass-panel" style="padding: 1.5rem; margin-bottom: 1.5rem;">
            <h4 style="margin-bottom: 1rem; color: var(--accent-primary);">Valori Nutrizionali</h4>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; text-align: center;">
                <div><div style="font-weight: 800;">${Math.round(meal.calories)}</div><div style="font-size: 0.7rem; color: var(--text-secondary);">KCAL</div></div>
                <div><div style="font-weight: 800;">${Math.round(meal.macros.protein)}g</div><div style="font-size: 0.7rem; color: var(--text-secondary);">PROT</div></div>
                <div><div style="font-weight: 800;">${Math.round(meal.macros.carbs)}g</div><div style="font-size: 0.7rem; color: var(--text-secondary);">CARB</div></div>
                <div><div style="font-weight: 800;">${Math.round(meal.macros.fat)}g</div><div style="font-size: 0.7rem; color: var(--text-secondary);">GRASSI</div></div>
            </div>
        </div>

        <h4 style="margin-bottom: 1rem;">Ingredienti</h4>
        <ul style="list-style: none;">
            ${meal.ingredients.map(ing => `
                <li style="display:flex; justify-content:space-between; padding: 0.8rem 0; border-bottom: 1px solid var(--glass-border);">
                    <span>${typeof ing === 'string' ? ing : ing.name}</span>
                    <span style="font-weight: 700;">${ing.amount || ''} ${ing.unit || ''}</span>
                </li>
            `).join('')}
            ${meal.smartAddition ? `
                <li style="display:flex; justify-content:space-between; padding: 0.8rem 0; color: var(--accent-primary); font-weight: 700;">
                    <span>+ ${meal.smartAddition.name}</span>
                    <span>${meal.smartAddition.amount}${meal.smartAddition.unit}</span>
                </li>
            ` : ''}
        </ul>

        <h4 style="margin: 1.5rem 0 1rem;">Preparazione</h4>
        <div style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;">
            ${meal.instructions || 'Segui la ricetta classica sul sito di riferimento o procedi con la cottura standard degli ingredienti elencati.'}
        </div>
    `;
    
    document.getElementById('meal-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('meal-modal').classList.add('hidden');
}

async function confirmMeal(date, type) {
    const day = appState.plan.find(p => p.date === date);
    day.meals[type].confirmed = !day.meals[type].confirmed;
    renderDashboard();
    await saveToCloud();
}

async function swapMeal(date, type) {
    const day = appState.plan.find(p => p.date === date);
    day.meals[type] = getRandomMeal(appState.recipes, type, appState.user.targetCalories * (type === 'breakfast' ? 0.2 : (type === 'snack' ? 0.1 : 0.35)));
    renderDashboard();
    await saveToCloud();
}

// ============================================================
// CALENDAR
// ============================================================
function renderMonthlyCalendar() {
    const container = document.getElementById('monthly-calendar-container');
    if (!container) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startOffset = firstDay.getDay();
    if (startOffset === 0) startOffset = 7;
    startOffset--; 

    let html = `
        <div class="calendar-month-grid">
            <div class="calendar-day-header" data-short="Lun"><span>Lunedì</span></div>
            <div class="calendar-day-header" data-short="Mar"><span>Martedì</span></div>
            <div class="calendar-day-header" data-short="Mer"><span>Mercoledì</span></div>
            <div class="calendar-day-header" data-short="Gio"><span>Giovedì</span></div>
            <div class="calendar-day-header" data-short="Ven"><span>Venerdì</span></div>
            <div class="calendar-day-header" data-short="Sab"><span>Sabato</span></div>
            <div class="calendar-day-header" data-short="Dom"><span>Domenica</span></div>
    `;

    for (let i = 0; i < startOffset; i++) {
        html += `<div class="calendar-day-cell empty" style="background: transparent; border: none;"></div>`;
    }

    const todayStr = getTodayISO();

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayPlan = appState.plan.find(p => p.date === dateStr);
        const isToday = dateStr === todayStr;

        html += `
            <div class="calendar-day-cell ${isToday ? 'is-today' : ''}" style="position: relative;" onclick="showDayDetails('${dateStr}')">
                <div class="calendar-date-number" style="font-weight: ${isToday ? '800' : '600'}; color: ${isToday ? 'var(--accent-primary)' : 'var(--text-secondary)'};">${d}</div>
                ${dayPlan ? `
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        ${Object.entries(dayPlan.meals).map(([type, m]) => {
                            if (!m) return '';
                            const icons = { breakfast: '☕', lunch: '🍱', snack: '🍎', dinner: '🍽️' };
                            return `<div class="calendar-meal-chip ${type} ${m.confirmed ? 'confirmed' : ''}" 
                                         style="font-size: 0.6rem; padding: 1px 3px; border-radius: 3px; ${m.confirmed ? 'background: var(--accent-primary); color: #000;' : ''}">
                                    ${icons[type]}
                                </div>`;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

function showDayDetails(dateStr) {
    const dayPlan = appState.plan.find(p => p.date === dateStr);
    if (!dayPlan) {
        alert("Nessun piano per questo giorno.");
        return;
    }

    const dateObj = new Date(dateStr + 'T00:00:00');
    const title = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

    let html = `
        <div class="day-detail-popup">
            <div class="day-detail-header">
                <h3 style="margin:0;">${title}</h3>
                <button onclick="this.closest('.day-detail-popup').remove()" style="background:none; border:none; color:var(--text-primary); font-size:1.5rem; cursor:pointer;">&times;</button>
            </div>
            <div class="day-detail-body">
                ${Object.entries(dayPlan.meals).map(([type, m]) => {
                    const labels = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino', dinner: 'Cena' };
                    const icons = { breakfast: '☕', lunch: '🍱', snack: '🍎', dinner: '🍽️' };
                    return `
                        <div class="day-detail-meal" onclick="this.closest('.day-detail-popup').remove(); openMealDetails('${dateStr}', '${type}')">
                            <span class="day-detail-icon">${icons[type]}</span>
                            <div class="day-detail-info">
                                <div class="day-detail-type">${labels[type]}</div>
                                <div class="day-detail-name">${m.name}</div>
                            </div>
                            ${m.confirmed ? '✅' : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            <button class="btn btn-primary" style="width:100%; margin-top:1rem;" onclick="this.closest('.day-detail-popup').remove(); showView('dashboard'); setTimeout(() => document.getElementById('day-${dateStr}')?.scrollIntoView({behavior:'smooth'}), 100)">Vai al Piano Settimanale</button>
        </div>
    `;

    const popup = document.createElement('div');
    popup.innerHTML = html;
    document.body.appendChild(popup.firstChild);
}

// ============================================================
// SHOPPING LIST
// ============================================================
function setupShoppingDaysSelector() {
    const selectorContainer = document.getElementById('shopping-days-selector');
    if (!selectorContainer) return;
    if (!appState.plan || appState.plan.length === 0) {
        selectorContainer.innerHTML = '';
        return;
    }
    
    const today = getTodayISO();
    const plan = appState.plan.filter(p => p.date >= today).slice(0, 7);
    
    let html = '';
    plan.forEach((day, index) => {
        const dateObj = new Date(day.date + 'T00:00:00');
        const dayName = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'][dateObj.getDay()];
        html += `
            <label style="display:flex; align-items:center; gap:0.5rem; background:rgba(0,0,0,0.2); padding:0.5rem 1rem; border-radius:8px; cursor:pointer;">
                <input type="checkbox" class="shopping-day-cb" value="${day.date}" ${index < 3 ? 'checked' : ''}>
                <span>${dayName} ${dateObj.getDate()}</span>
            </label>
        `;
    });
    html += `
        <button class="btn btn-primary" style="margin-top: 1rem; width: 100%;" onclick="renderShoppingList(true)">Genera Lista Selezionata</button>
    `;
    selectorContainer.innerHTML = html;
}

function renderShoppingList(forceGenerate = false) {
    const container = document.getElementById('shopping-list-content');
    if (!container) return;
    
    if (!forceGenerate) {
        container.innerHTML = `
            <div class="text-center" style="padding: 2rem; color: var(--text-secondary);">
                <p>Seleziona i giorni desiderati sopra e clicca su <strong>"Genera Lista Selezionata"</strong>.</p>
            </div>
        `;
        return;
    }

    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = `<p class="text-center">Nessun piano trovato.</p>`;
        return;
    }

    const checkboxes = document.querySelectorAll('.shopping-day-cb');
    const selectedDates = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

    if (selectedDates.length === 0) {
        container.innerHTML = `<p class="text-center text-muted">Seleziona almeno un giorno.</p>`;
        return;
    }

    const selectedDays = appState.plan.filter(day => selectedDates.includes(day.date));
    const items = {};

    selectedDays.forEach(day => {
        Object.values(day.meals).forEach(meal => {
            if (!meal) return;
            const portion = meal.portion || 1;
            
            meal.ingredients.forEach(ing => {
                let name = "";
                let amount = 0;
                let unit = "";

                if (typeof ing === 'string') {
                    const match = ing.match(/^([\d.,]+)\s*([a-zA-Z]+)?\s*(.*)$/);
                    if (match) {
                        amount = parseFloat(match[1].replace(',', '.'));
                        unit = match[2] || "";
                        name = match[3].trim();
                    } else {
                        name = ing;
                    }
                } else {
                    name = ing.name;
                    amount = parseFloat(ing.amount) || 0;
                    unit = ing.unit || "";
                }

                if (!name) return;

                const key = `${name.toLowerCase().trim()}-${unit.toLowerCase().trim()}`;
                if (!items[key]) items[key] = { name: name, amount: 0, unit: unit };
                items[key].amount += (amount * portion);
            });

            if (meal.smartAddition) {
                const sa = meal.smartAddition;
                const key = `${sa.name.toLowerCase().trim()}-${sa.unit.toLowerCase().trim()}`;
                if (!items[key]) items[key] = { name: sa.name, amount: 0, unit: sa.unit };
                items[key].amount += sa.amount;
            }
        });
    });

    const CATEGORIES = {
        '🥩 Carne & Pesce':   ['pollo','manzo','salmone','tonno','merluzzo','tacchino','maiale','prosciutto','bresaola','speck','sgombro','gamberi','cozze','vongole','pesce','carne','filetto','bistecca','cotoletta','hamburger','wurstel','macinato','agnello','fesa','trito','salmone','orata','branzino','spada','alici'],
        '🥛 Latticini & Uova': ['latte','panna','yogurt','burro','mozzarella','parmigiano','pecorino','ricotta','uova','uovo','formaggio','grana','emmental','stracchino','mascarpone','gorgonzola','feta','skyr','scamorza','philadelphia','robiola','provola'],
        '🍞 Pane & Cereali':   ['pane','pasta','riso','farro','orzo','avena','farina','semola','crackers','grissini','pancarré','pangrattato','polenta','lasagne','gnocchi','couscous','quinoa','fette biscottate','cereali','muesli','mais','gallette','piadina','tortilla'],
        '🫒 Condimenti & Grassi': ['olio','aceto','sale','pepe','zucchero','miele','salsa','maionese','ketchup','senape','dado','brodo','pesto','tahini','soia','crema','dolcificante','lievito','vaniglia'],
        '🌿 Spezie & Aromi':   ['aglio','cipolla','prezzemolo','basilico','rosmarino','origano','timo','menta','zenzero','curcuma','paprika','cannella','peperoncino','curry','alloro','salvia','erba','noce moscata','chiodi di garofano','zafferano'],
        '🥫 Conserve & Scatolame': ['pomodori','passata','pelati','legumi','fagioli','ceci','lenticchie','mais','tonno in scatola','sardine','acciughe','olive','capperi','funghi secchi','concentrato','piselli in scatola','fagiolini in scatola'],
        '🫙 Frutta Secca & Semi': ['noci','mandorle','nocciole','pistacchi','anacardi','pinoli','semi di','sesamo','lino','girasole','chia','cocco','burro d\'arachidi','arachidi','semi di zucca'],
        '🍎 Frutta':           ['mele','banane','arance','limone','lime','fragole','mirtilli','lamponi','pesche','pere','uva','kiwi','melone','anguria','ananas','avocado','mango','pompelmo','albicocche','prugne','fichi','ciliegie'],
        '🥦 Verdure':          ['spinaci','zucchine','carote','broccoli','cavolfiore','cavolo','melanzane','peperoni','pomodori freschi','lattuga','insalata','sedano','finocchio','asparagi','piselli','carciofi','radicchio','bietole','patate','cipollotti','rucola','valeriana','zucca','porri','fagiolini','indivia','scarola','catalogna','misticanza'],
    };

    function getCategory(name) {
        const lower = name.toLowerCase();
        for (const [cat, keywords] of Object.entries(CATEGORIES)) {
            if (keywords.some(k => lower.includes(k))) return cat;
        }
        return '🛒 Altro';
    }

    const grouped = {};
    Object.values(items).forEach(item => {
        const cat = getCategory(item.name);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    const sortedCats = Object.keys(CATEGORIES).concat(['🛒 Altro']).filter(c => grouped[c]);

    container.innerHTML = sortedCats.map(cat => `
        <div class="shopping-category">
            <h4 class="shopping-category-title">${cat}</h4>
            <div class="shopping-items-list">
                ${grouped[cat].sort((a,b) => a.name.localeCompare(b.name)).map(item => `
                    <div class="shopping-item">
                        <input type="checkbox">
                        <span class="shopping-item-name">${item.name}</span>
                        <span class="shopping-item-amount">${item.amount > 0 ? Math.round(item.amount) : ''} ${item.unit}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// ============================================================
// PROFILE
// ============================================================
function renderProfile() {
    const container = document.getElementById('profile-data');
    if (!container) return;
    const u = appState.user;
    if (!u) return;

    const labels = {
        gender: u.gender === 'male' ? 'Uomo' : 'Donna',
        activity: { '1.2': 'Sedentario', '1.375': 'Leggero', '1.55': 'Moderato', '1.725': 'Attivo' },
        goal: { 'lose': 'Perdere peso', 'maintain': 'Mantenimento', 'gain': 'Aumento massa' },
        diet: { 'standard': 'Standard', 'vegetarian': 'Vegetariana', 'vegan': 'Vegana' }
    };

    container.innerHTML = `
        <div id="profile-summary">
            <div id="profile-save-feedback" class="profile-save-feedback hidden">Salvataggio completato! ✨</div>
            
            <div class="profile-summary-grid">
                <div class="profile-stat-card">
                    <div class="profile-stat-label">Peso</div>
                    <div class="profile-stat-value">${u.weight} <span class="profile-stat-unit">kg</span></div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-label">Altezza</div>
                    <div class="profile-stat-value">${u.height} <span class="profile-stat-unit">cm</span></div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-label">BMI</div>
                    <div class="profile-stat-value">${u.bmi || '--'}</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 4px;">${u.bmiCategory || ''}</div>
                </div>
                <div class="profile-stat-card">
                    <div class="profile-stat-label">Età</div>
                    <div class="profile-stat-value">${u.age} <span class="profile-stat-unit">anni</span></div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 2rem;">
                <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="display:block; font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Obiettivo</span>
                    <span style="font-weight: 700;">${labels.goal[u.goal] || u.goal}</span>
                </div>
                <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="display:block; font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Tipo di Dieta</span>
                    <span style="font-weight: 700; color: var(--accent-primary);">${labels.diet[u.diet_type] || u.diet_type}</span>
                </div>
                <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="display:block; font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Attività</span>
                    <span style="font-weight: 700;">${labels.activity[u.activity_level] || u.activity_level}</span>
                </div>
                <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="display:block; font-size: 0.7rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 4px;">Target</span>
                    <span style="font-weight: 700;">${u.targetCalories} <span style="font-size: 0.7rem;">KCAL</span></span>
                </div>
            </div>

            <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border); margin-bottom: 2rem;">
                <div style="color: var(--text-secondary); margin-bottom: 0.4rem; font-size: 0.7rem; text-transform: uppercase;">Esclusioni</div>
                <div style="font-weight: 600; font-size: 0.95rem;">${u.dislikes || 'Nessuna'}</div>
            </div>

            <button class="btn btn-primary" style="width: 100%; padding: 1rem;" onclick="document.getElementById('profile-summary').classList.add('hidden'); document.getElementById('edit-profile-form').classList.remove('hidden');">
                ✏️ Modifica Dati Profilo
            </button>
        </div>

        <form id="edit-profile-form" class="hidden" onsubmit="saveProfile(event)">
            <h3 style="margin-bottom: 1.5rem; font-size: 1.25rem;">Modifica il tuo Profilo</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Peso (kg)</label>
                    <input type="number" id="edit-weight" required min="30" max="250" step="0.1" value="${u.weight}">
                </div>
                <div class="form-group">
                    <label>Altezza (cm)</label>
                    <input type="number" id="edit-height" required min="100" max="250" value="${u.height}">
                </div>
                <div class="form-group">
                    <label>Obiettivo</label>
                    <select id="edit-goal">
                        <option value="lose" ${u.goal === 'lose' ? 'selected' : ''}>Perdere peso</option>
                        <option value="maintain" ${u.goal === 'maintain' ? 'selected' : ''}>Mantenimento</option>
                        <option value="gain" ${u.goal === 'gain' ? 'selected' : ''}>Aumento massa</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Attività</label>
                    <select id="edit-activity">
                        <option value="1.2" ${u.activity_level == 1.2 ? 'selected' : ''}>Sedentario</option>
                        <option value="1.375" ${u.activity_level == 1.375 ? 'selected' : ''}>Leggero</option>
                        <option value="1.55" ${u.activity_level == 1.55 ? 'selected' : ''}>Moderato</option>
                        <option value="1.725" ${u.activity_level == 1.725 ? 'selected' : ''}>Attivo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dieta</label>
                    <select id="edit-diet">
                        <option value="standard" ${u.diet_type === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="vegetarian" ${u.diet_type === 'vegetarian' ? 'selected' : ''}>Vegetariana</option>
                        <option value="vegan" ${u.diet_type === 'vegan' ? 'selected' : ''}>Vegana</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin-top: 1.5rem;">
                <label>Cibi da evitare (separati da virgola)</label>
                <textarea id="edit-dislikes" rows="2" style="width:100%;">${u.dislikes || ''}</textarea>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                <button type="submit" class="btn btn-primary" style="flex: 2;">💾 Salva Cambiamenti</button>
                <button type="button" class="btn" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);" onclick="renderProfile()">Annulla</button>
            </div>
        </form>
    `;
}

async function saveProfile(e) {
    e.preventDefault();
    const u = appState.user;
    
    u.weight = parseFloat(document.getElementById('edit-weight').value);
    u.height = parseInt(document.getElementById('edit-height').value);
    u.goal = document.getElementById('edit-goal').value;
    u.activity_level = parseFloat(document.getElementById('edit-activity').value);
    u.diet_type = document.getElementById('edit-diet').value;
    u.dislikes = document.getElementById('edit-dislikes').value;

    const bmr = calculateBMR(u.weight, u.height, u.age, u.gender);
    const tdee = calculateTDEE(bmr, u.activity_level);
    u.targetCalories = calculateTargetCalories(tdee, u.goal);
    
    const bmiInfo = calculateBMI(u.weight, u.height);
    u.bmi = bmiInfo.bmi;
    u.bmiCategory = bmiInfo.category;

    showLoader();
    try {
        await saveToCloud();
        renderProfile();
        const feedback = document.getElementById('profile-save-feedback');
        if (feedback) {
            feedback.classList.remove('hidden');
            setTimeout(() => feedback.classList.add('hidden'), 3000);
        }
    } catch (err) {
        console.error("Save error:", err);
    } finally {
        hideLoader();
    }
}

async function resetProfile() {
    if (!confirm("ATTENZIONE: Questo cancellerà il tuo profilo e il tuo piano alimentare attuale. Procedere?")) return;
    showLoader();
    const { error } = await _supabase.from('user_profiles').delete().eq('id', currentUser.id);
    if (!error) window.location.reload();
    else alert("Errore durante il reset.");
}

// ============================================================
// BOOTSTRAP
// ============================================================
window.app = {
    showView,
    closeModal
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log("NutriPlan: DOM Content Loaded.");
    initDomRefs();

    if (typeof _supabase === 'undefined') {
        console.error("NutriPlan: _supabase is not defined!");
        hideLoader();
        return;
    }

    _supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("NutriPlan: Auth state changed:", event);
        try {
            if (session) {
                currentUser = session.user;
                await fetchRecipesFromSupabase();
                const hasProfile = await loadFromCloud();
                if (hasProfile) showView('dashboard');
                else showView('onboarding');
            } else {
                showView('auth');
            }
        } catch (err) {
            console.error("Initialization error:", err);
            showView('auth');
        } finally {
            hideLoader();
        }
    });

    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader && loader.style.display !== 'none') {
            console.warn("NutriPlan: Safety loader hide triggered.");
            hideLoader();
        }
    }, 10000);
});
