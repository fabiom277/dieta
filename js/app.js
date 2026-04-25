// --- APP STATE ---
let appState = { user: null, plan: [] };
let currentUser = null; 
let saveTimeout = null;
let sessionSkippedIds = []; 
let recipesLoaded = false;

// --- DOM REFS ---
let mainNav;

function initDomRefs() {
    mainNav = document.getElementById('main-nav');
}

// ============================================================
// AUTH
// ============================================================

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');
    const submitBtn = document.getElementById('login-submit');

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerText = 'Accesso in corso...';

    try {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (err) {
        errorEl.innerText = "Errore: " + err.message;
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerText = 'Accedi';
    }
}

async function handleOnboardingSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    
    // Account Data
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // Profile Data
    const profileData = {
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value),
        weight: parseFloat(document.getElementById('weight').value),
        height: parseInt(document.getElementById('height').value),
        activity: parseFloat(document.getElementById('activity').value),
        goal: document.getElementById('goal').value,
        diet_type: document.getElementById('diet-type').value,
        eating_pattern: document.getElementById('eating-pattern').value,
        dislikes: document.getElementById('dislikes').value
    };

    submitBtn.disabled = true;
    submitBtn.innerText = 'Elaborazione...';

    try {
        let userId = currentUser?.id;

        // 1. Sign Up ONLY if not logged in
        if (!userId) {
            const { data: authData, error: authError } = await _supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { first_setup: true } }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("Errore durante la creazione dell'account.");
            userId = authData.user.id;
        }

        // 2. Prepare Plan
        const bmr = calculateBMR(profileData.weight, profileData.height, profileData.age, profileData.gender);
        profileData.targetCalories = calculateTargetCalories(calculateTDEE(bmr, profileData.activity), profileData.goal);
        
        const plan = generateMonthlyPlan(profileData);

        // 3. Save to user_data
        const { error: dbError } = await _supabase.from('user_data').upsert({
            id: userId,
            nutrition_profile: profileData,
            meal_plan: plan,
            updated_at: new Date().toISOString()
        });

        if (dbError) {
            console.error("Database error:", dbError);
            // Even if DB save fails here, the auth state change will likely catch it or the user can retry.
        }

        appState.user = profileData;
        appState.plan = plan;
        
        alert("Account creato con successo! Verificando la sessione...");
        
    } catch (err) {
        alert("Errore: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
}

// ============================================================
// DATA LOADING
// ============================================================

async function fetchRecipesFromSupabase() {
    try {
        const { data, error } = await _supabase.from('recipes').select('*');
        if (error) throw error;
        
        const normalized = data.map(r => ({
            ...r,
            baseCalories: r.base_calories,
            imageUrl: r.image_url,
            sourceUrl: r.source_url
        }));

        recipesDB = normalized.filter(r => r.type !== 'snack');
        snacksDB = normalized.filter(r => r.type === 'snack');
        recipesLoaded = true;
        return true;
    } catch (err) {
        console.error("Fetch error:", err);
        return false;
    }
}

async function saveToCloud() {
    if (!currentUser) return;
    await _supabase.from('user_data').upsert({
        id: currentUser.id,
        nutrition_profile: appState.user,
        meal_plan: appState.plan,
        updated_at: new Date().toISOString()
    });
}

function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToCloud, 1000);
}

async function loadFromCloud() {
    if (!currentUser) return false;
    const { data, error } = await _supabase.from('user_data').select('*').eq('id', currentUser.id).single();
    if (error || !data) return false;
    appState.user = data.nutrition_profile;
    appState.plan = data.meal_plan || [];
    return true;
}

// ============================================================
// NAVIGATION & VIEWS
// ============================================================

function showView(viewName) {
    const views = ['auth', 'onboarding', 'dashboard', 'shopping', 'profile', 'calendar', 'admin'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    // Hide account section if already logged in (e.g. during profile reset)
    const accountSection = document.querySelector('#onboarding-form div[style*="border-top"]');
    if (accountSection) {
        if (currentUser) {
            accountSection.classList.add('hidden');
            document.getElementById('reg-email').required = false;
            document.getElementById('reg-password').required = false;
        } else {
            accountSection.classList.remove('hidden');
            document.getElementById('reg-email').required = true;
            document.getElementById('reg-password').required = true;
        }
    }

    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'calendar') renderMonthlyCalendar();
    if (viewName === 'shopping') renderShoppingList();
    if (viewName === 'profile') renderProfile();
    if (viewName === 'admin') admin.init();

    // Toggle menu visibility
    if (['auth', 'onboarding'].includes(viewName)) {
        document.getElementById('main-nav').classList.add('hidden');
    } else {
        document.getElementById('main-nav').classList.remove('hidden');
    }
    
    // Close mobile menu if open
    document.getElementById('main-nav').classList.remove('mobile-active');
}

// ============================================================
// DASHBOARD
// ============================================================

function renderDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container || !appState.plan) return;

    const today = getTodayISO();
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    let html = `
        <div class="dashboard-header">
            <div>
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">Ciao! 👋</h1>
                <p class="text-muted">Ecco il tuo piano alimentare per la settimana.</p>
                <p id="caloric-info" style="margin-top:0.5rem; color:var(--accent-primary); font-weight:700;">Target: ${appState.user.targetCalories} kcal/giorno</p>
            </div>
        </div>
    `;

    visiblePlan.forEach(day => {
        let totalCals = 0;
        Object.values(day.meals).forEach(m => totalCals += (m.calories || 0));

        html += `
            <div class="day-card ${day.date === today ? 'today' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px solid var(--glass-border); padding-bottom:1rem;">
                    <h2 style="text-transform:capitalize;">${new Date(day.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
                    <span style="font-weight:800; color:var(--accent-primary);">${Math.round(totalCals)} kcal</span>
                </div>
                <div class="meals-grid">
                    ${renderMealSlot(day.date, 'breakfast', day.meals.breakfast)}
                    ${renderMealSlot(day.date, 'snack', day.meals.snack)}
                    ${renderMealSlot(day.date, 'lunch', day.meals.lunch)}
                    ${renderMealSlot(day.date, 'dinner', day.meals.dinner)}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderMealSlot(date, type, meal) {
    if (!meal) return '';
    const labels = { breakfast: 'Colazione', snack: 'Spuntino', lunch: 'Pranzo', dinner: 'Cena' };
    
    return `
        <div class="meal-card" onclick="openMealDetails('${date}', '${type}')">
            ${meal.imageUrl ? `<img src="${meal.imageUrl}" alt="${meal.name}">` : ''}
            <div class="meal-tag">${labels[type]}</div>
            <h3 style="margin-bottom:0.5rem; font-size:1.1rem;">${meal.name}</h3>
            ${meal.portion > 1.05 ? `<span class="portion-badge">Dose x${meal.portion.toFixed(1)}</span>` : ''}
            ${meal.smartAddition ? `<div class="smart-addition-tag">+ ${meal.smartAddition.amount}${meal.smartAddition.unit} ${meal.smartAddition.name}</div>` : ''}
            <div style="display:flex; gap:1rem; margin-top:1rem; font-size:0.8rem; opacity:0.7;">
                <span>🔥 ${Math.round(meal.calories)} kcal</span>
                <span>🥩 ${Math.round(meal.macros.protein * (meal.portion || 1))}g</span>
            </div>
            <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                <button class="btn-swap btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="event.stopPropagation(); swapMeal('${date}', '${type}')">Cambia</button>
            </div>
        </div>
    `;
}

function openMealDetails(date, mealType) {
    const dayPlan = appState.plan.find(p => p.date === date);
    const meal    = dayPlan.meals[mealType];
    const labels  = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino', dinner: 'Cena' };
    const portion = meal.portion || 1.0;

    let html = '';
    if (meal.imageUrl) html += `<img src="${meal.imageUrl}" class="recipe-header-img" alt="${meal.name}">`;

    let additionHtml = '';
    if (meal.smartAddition) {
        additionHtml = `
            <div style="background:rgba(16, 185, 129, 0.1); border-left:4px solid var(--accent-primary); padding:1rem; margin:1rem 0; border-radius:8px;">
                <h4 style="color:var(--accent-primary); margin-bottom:0.3rem;">💡 Integrazione Consigliata</h4>
                <p style="font-size:0.9rem;">Per raggiungere il tuo target, aggiungi: <strong>${meal.smartAddition.amount}${meal.smartAddition.unit} di ${meal.smartAddition.name}</strong>.</p>
            </div>
        `;
    }

    html += `<div class="recipe-body">
        <div class="meal-tag">${labels[mealType]} ${portion > 1.05 ? `(x${portion.toFixed(1)})` : ''}</div>
        <h2 style="font-size:2rem; margin-bottom:1rem;">${meal.name}</h2>
        
        <div class="recipe-meta">
            <div class="meta-item"><span class="label">Calorie</span><span class="value">${Math.round(meal.calories)}</span></div>
            <div class="meta-item"><span class="label">Prot</span><span class="value">${Math.round(meal.macros.protein * portion)}g</span></div>
            <div class="meta-item"><span class="label">Carb</span><span class="value">${Math.round(meal.macros.carbs * portion)}g</span></div>
            <div class="meta-item"><span class="label">Fat</span><span class="value">${Math.round(meal.macros.fat * portion)}g</span></div>
        </div>

        ${additionHtml}

        <div class="recipe-section">
            <h4>Ingredienti</h4>
            <ul style="list-style:none;">
                ${meal.ingredients.map(i => {
                    const amt = isNaN(parseFloat(i.amount)) ? i.amount : (parseFloat(i.amount) * portion).toFixed(0);
                    return `<li style="padding:0.5rem 0; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between;">
                        <span>${i.name}</span>
                        <span style="font-weight:700; color:var(--accent-primary);">${amt} ${i.unit}</span>
                    </li>`;
                }).join('')}
            </ul>
        </div>

        <div class="recipe-section">
            <h4>Preparazione</h4>
            <ol style="padding-left:1.2rem; line-height:1.6;">
                ${meal.instructions.map(s => `<li style="margin-bottom:0.8rem;">${s}</li>`).join('')}
            </ol>
        </div>
    </div>`;

    document.getElementById('modal-body-content').innerHTML = html;
    document.getElementById('recipe-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('recipe-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// ============================================================
// PROFILE
// ============================================================

function renderProfile() {
    const container = document.getElementById('profile-container');
    const u = appState.user;
    const dietLabels = { standard: 'Standard', vegetarian: 'Vegetariana', vegan: 'Vegana' };
    const patternLabels = { standard: 'Standard', if_morning: 'Intermittente (Mattina)', if_evening: 'Intermittente (Sera)' };

    container.innerHTML = `
        <div class="dashboard-header">
            <h2 style="font-size:2rem;">Il Mio Profilo</h2>
        </div>
        <div class="day-card">
            <div class="form-grid">
                <div><label>Peso</label><p style="font-size:1.5rem; font-weight:700;">${u.weight} kg</p></div>
                <div><label>Altezza</label><p style="font-size:1.5rem; font-weight:700;">${u.height} cm</p></div>
                <div><label>Target</label><p style="font-size:1.5rem; font-weight:700; color:var(--accent-primary);">${u.targetCalories} kcal</p></div>
                <div><label>Dieta</label><p style="font-weight:600;">${dietLabels[u.diet_type]}</p></div>
                <div><label>Schema</label><p style="font-weight:600;">${patternLabels[u.eating_pattern]}</p></div>
            </div>
            <div style="margin-top:2rem; display:flex; gap:1rem;">
                <button class="btn-primary" onclick="regeneratePlan()">🔄 Rigenera Piano</button>
                <button class="btn-outline" onclick="resetProfile()">⚠️ Reset Profilo</button>
            </div>
        </div>
    `;
}

function regeneratePlan() {
    if (confirm("Vuoi rigenerare i pasti per la settimana?")) {
        appState.plan = generateMonthlyPlan(appState.user);
        debouncedSave();
        showView('dashboard');
    }
}

function resetProfile() {
    if (confirm("Attenzione: tutti i tuoi dati verranno cancellati. Procedere?")) {
        appState = { user: null, plan: [] };
        saveToCloud();
        showView('onboarding');
    }
}

// ============================================================
// CALENDAR
// ============================================================

function renderMonthlyCalendar() {
    const container = document.getElementById('view-calendar');
    const today = getTodayISO();
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    let html = `
        <div class="dashboard-header">
            <h2 style="font-size:2rem;">🗓️ Calendario Settimanale</h2>
        </div>
        <div class="calendar-month-grid">
            <div class="calendar-day-header" data-short="Lun"><span>Lunedì</span></div>
            <div class="calendar-day-header" data-short="Mar"><span>Martedì</span></div>
            <div class="calendar-day-header" data-short="Mer"><span>Mercoledì</span></div>
            <div class="calendar-day-header" data-short="Gio"><span>Giovedì</span></div>
            <div class="calendar-day-header" data-short="Ven"><span>Venerdì</span></div>
            <div class="calendar-day-header" data-short="Sab"><span>Sabato</span></div>
            <div class="calendar-day-header" data-short="Dom"><span>Domenica</span></div>
    `;

    const firstDate = new Date(visiblePlan[0]?.date + 'T00:00:00');
    let dayIdx = firstDate.getDay();
    if (dayIdx === 0) dayIdx = 7;

    for (let i = 1; i < dayIdx; i++) html += `<div class="calendar-day-cell empty"></div>`;

    visiblePlan.forEach(day => {
        html += `
            <div class="calendar-day-cell ${day.date === today ? 'is-today' : ''}">
                <div class="calendar-date-number">${new Date(day.date + 'T00:00:00').getDate()}</div>
                ${day.meals.breakfast ? `<div class="calendar-meal-chip breakfast" onclick="openMealDetails('${day.date}', 'breakfast')">☕ <span>${day.meals.breakfast.name}</span></div>` : ''}
                ${day.meals.snack ? `<div class="calendar-meal-chip snack" onclick="openMealDetails('${day.date}', 'snack')">🍎 <span>${day.meals.snack.name}</span></div>` : ''}
                ${day.meals.lunch ? `<div class="calendar-meal-chip lunch" onclick="openMealDetails('${day.date}', 'lunch')">🍝 <span>${day.meals.lunch.name}</span></div>` : ''}
                ${day.meals.dinner ? `<div class="calendar-meal-chip dinner" onclick="openMealDetails('${day.date}', 'dinner')">🌙 <span>${day.meals.dinner.name}</span></div>` : ''}
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ============================================================
// SHOPPING LIST
// ============================================================

function renderShoppingList() {
    const container = document.getElementById('shopping-list-container');
    const today = getTodayISO();
    const plan = appState.plan.filter(p => p.date >= today).slice(0, 7);
    
    const items = {};
    plan.forEach(day => {
        Object.values(day.meals).forEach(meal => {
            if (!meal) return;
            const portion = meal.portion || 1;
            meal.ingredients.forEach(ing => {
                const key = `${ing.name}-${ing.unit}`;
                if (!items[key]) items[key] = { name: ing.name, amount: 0, unit: ing.unit };
                const amt = parseFloat(ing.amount);
                if (!isNaN(amt)) items[key].amount += (amt * portion);
            });
            if (meal.smartAddition) {
                const sa = meal.smartAddition;
                const key = `${sa.name}-${sa.unit}`;
                if (!items[key]) items[key] = { name: sa.name, amount: 0, unit: sa.unit };
                items[key].amount += sa.amount;
            }
        });
    });

    let html = `
        <div class="day-card">
            <ul style="list-style:none;">
                ${Object.values(items).map(item => `
                    <li style="padding:0.75rem 0; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between; align-items:center;">
                        <label style="display:flex; align-items:center; gap:0.75rem; cursor:pointer;">
                            <input type="checkbox">
                            <span>${item.name}</span>
                        </label>
                        <span style="font-weight:700; color:var(--accent-primary);">${Math.round(item.amount)} ${item.unit}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    container.innerHTML = html;
}

// ============================================================
// BOOTSTRAP
// ============================================================

window.app = {
    showView,
    closeModal
};

document.addEventListener('DOMContentLoaded', async () => {
    initDomRefs();

    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
            currentUser = session.user;
            await fetchRecipesFromSupabase();
            const hasProfile = await loadFromCloud();
            if (hasProfile) showView('dashboard');
            else showView('onboarding');
        } else {
            showView('auth');
        }
    });

    document.getElementById('login-form').onsubmit = handleLoginSubmit;
    document.getElementById('onboarding-form').onsubmit = handleOnboardingSubmit;
    
    document.getElementById('mobile-menu-toggle').onclick = () => {
        document.getElementById('main-nav').classList.toggle('mobile-active');
    };

    document.getElementById('btn-logout').onclick = () => _supabase.auth.signOut();
});

// Global exposure
window.swapMeal = (date, type) => {
    const idx = appState.plan.findIndex(p => p.date === date);
    const current = appState.plan[idx].meals[type];
    const alt = findAlternativeMeal(current, appState.user, current.calories, [current.id]);
    if (alt) {
        appState.plan[idx].meals[type] = alt;
        debouncedSave();
        renderDashboard();
    }
};
