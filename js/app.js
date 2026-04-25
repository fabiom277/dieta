// --- APP STATE ---
let appState = { user: null, plan: [] };
let currentUser = null; 
let saveTimeout = null;
let sessionSkippedIds = []; 
let recipesLoaded = false;

// --- UTILS ---
function hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

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
    // if (viewName === 'admin') admin.init(); // Admin has its own page

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
    const container = document.getElementById('calendar-grid'); // Fixed selector based on index.html
    if (!container || !appState.plan) return;

    const today = getTodayISO();
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    // Update caloric info
    const calInfo = document.getElementById('caloric-info');
    if (calInfo) calInfo.innerHTML = `Fabbisogno calcolato: <span class="highlight">${appState.user.targetCalories} kcal</span>/giorno`;

    let html = '';
    visiblePlan.forEach(day => {
        let totalCals = 0;
        Object.values(day.meals).forEach(m => totalCals += (m.calories || 0));

        html += `
            <div class="day-card ${day.date === today ? 'today' : ''}">
                <div class="day-header">
                    <h3>${new Date(day.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
                    <span class="day-kcal">${Math.round(totalCals)} kcal</span>
                </div>
                ${renderMealSlot(day.date, 'breakfast', day.meals.breakfast)}
                ${renderMealSlot(day.date, 'snack', day.meals.snack)}
                ${renderMealSlot(day.date, 'lunch', day.meals.lunch)}
                ${renderMealSlot(day.date, 'dinner', day.meals.dinner)}
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderMealSlot(date, type, meal) {
    if (!meal) return '';
    const labels = { breakfast: 'Colazione', snack: 'Spuntino', lunch: 'Pranzo', dinner: 'Cena' };
    const portion = meal.portion || 1.0;
    
    return `
        <div class="meal-slot" onclick="openMealDetails('${date}', '${type}')">
            <div class="meal-type">
                <span>${labels[type]}</span>
                <span>${Math.round(meal.calories)} kcal</span>
            </div>
            <div class="meal-name">${meal.name} ${portion > 1.05 ? `<span class="portion-badge">x${portion.toFixed(1)}</span>` : ''}</div>
            ${meal.smartAddition ? `<div class="smart-addition-tag">+ ${meal.smartAddition.amount}${meal.smartAddition.unit} ${meal.smartAddition.name}</div>` : ''}
            <div class="meal-macros">
                <span>🥩 ${Math.round(meal.macros.protein * portion)}g</span>
                <span>🍝 ${Math.round(meal.macros.carbs * portion)}g</span>
                <span>🥑 ${Math.round(meal.macros.fat * portion)}g</span>
            </div>
            <div class="meal-actions">
                <button class="btn-small btn-swap" onclick="event.stopPropagation(); swapMeal('${date}', '${type}')">🔄 Cambia</button>
            </div>
        </div>
    `;
}

function openMealDetails(date, mealType) {
    const dayPlan = appState.plan.find(p => p.date === date);
    if (!dayPlan) return;
    const meal    = dayPlan.meals[mealType];
    if (!meal) return;
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
        <div class="meta-item"><span class="label">${labels[mealType]}</span></div>
        <h2 style="font-size:2rem; margin-bottom:1rem;">${meal.name}</h2>
        
        <div class="recipe-meta">
            <div class="meta-item"><span class="label">Calorie</span><span class="value">${Math.round(meal.calories)}</span></div>
            <div class="meta-item"><span class="label">Proteine</span><span class="value">${Math.round(meal.macros.protein * portion)}g</span></div>
            <div class="meta-item"><span class="label">Carboidrati</span><span class="value">${Math.round(meal.macros.carbs * portion)}g</span></div>
            <div class="meta-item"><span class="label">Grassi</span><span class="value">${Math.round(meal.macros.fat * portion)}g</span></div>
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

    document.getElementById('meal-details').innerHTML = html;
    document.getElementById('meal-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('meal-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// ============================================================
// PROFILE
// ============================================================

function renderProfile() {
    const container = document.getElementById('profile-data');
    if (!container) return;
    const u = appState.user;
    const dietLabels = { standard: 'Standard', vegetarian: 'Vegetariana', vegan: 'Vegana' };
    const patternLabels = { standard: 'Standard (3 Pasti)', if_morning: 'Intermittente (Mattina)', if_evening: 'Intermittente (Sera)' };

    container.innerHTML = `
        <div class="profile-grid">
            <div class="profile-edit-card"><span class="label">Peso</span><div class="value">${u.weight} kg</div></div>
            <div class="profile-edit-card"><span class="label">Altezza</span><div class="value">${u.height} cm</div></div>
            <div class="profile-edit-card"><span class="label">Età</span><div class="value">${u.age} anni</div></div>
            <div class="profile-edit-card"><span class="label">Target</span><div class="value highlight">${u.targetCalories} kcal</div></div>
            <div class="profile-edit-card"><span class="label">Dieta</span><div class="value">${dietLabels[u.diet_type] || u.diet_type}</div></div>
            <div class="profile-edit-card"><span class="label">Schema</span><div class="value">${patternLabels[u.eating_pattern] || u.eating_pattern}</div></div>
        </div>
        <div class="profile-edit-card full-width" style="margin-top:1rem;">
            <span class="label">Cibi da evitare</span>
            <div class="value">${u.dislikes || 'Nessuno'}</div>
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
    if (confirm("Vuoi resettare il profilo e inserire nuovi dati?")) {
        // We don't sign out, just show onboarding
        showView('onboarding');
    }
}

// ============================================================
// CALENDAR
// ============================================================

function renderMonthlyCalendar() {
    const container = document.getElementById('monthly-calendar-container');
    const today = getTodayISO();
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 14); // Show 2 weeks in calendar

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
    const container = document.getElementById('shopping-days-selector');
    const listContent = document.getElementById('shopping-list-content');
    const today = getTodayISO();
    const plan = appState.plan.filter(p => p.date >= today).slice(0, 14);

    if (!container) return;

    container.innerHTML = plan.map(day => {
        const dateObj = new Date(day.date + 'T00:00:00');
        const label = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        return `
            <label class="btn-small" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;">
                <input type="checkbox" class="shop-day-cb" value="${day.date}" checked>
                ${label}
            </label>
        `;
    }).join('');

    document.getElementById('generate-shopping').onclick = () => {
        const selectedDates = Array.from(document.querySelectorAll('.shop-day-cb:checked')).map(cb => cb.value);
        const selectedPlan = plan.filter(p => selectedDates.includes(p.date));
        
        const items = {};
        selectedPlan.forEach(day => {
            Object.values(day.meals).forEach(meal => {
                if (!meal) return;
                const portion = meal.portion || 1;
                meal.ingredients.forEach(ing => {
                    const key = `${ing.name.toLowerCase()}-${ing.unit}`;
                    if (!items[key]) items[key] = { name: ing.name, amount: 0, unit: ing.unit };
                    const amt = parseFloat(ing.amount);
                    if (!isNaN(amt)) items[key].amount += (amt * portion);
                });
                if (meal.smartAddition) {
                    const sa = meal.smartAddition;
                    const key = `${sa.name.toLowerCase()}-${sa.unit}`;
                    if (!items[key]) items[key] = { name: sa.name, amount: 0, unit: sa.unit };
                    items[key].amount += sa.amount;
                }
            });
        });

        if (Object.keys(items).length === 0) {
            listContent.innerHTML = `<p class="text-center text-muted">Nessun ingrediente trovato per i giorni selezionati.</p>`;
            return;
        }

        listContent.innerHTML = `
            <div class="ingredient-list">
                ${Object.values(items).map(item => `
                    <div class="ingredient-item">
                        <label style="display:flex; align-items:center; gap:0.75rem; cursor:pointer; width:100%;">
                            <input type="checkbox" class="ingredient-checkbox">
                            <span style="flex:1;">${item.name}</span>
                            <span style="font-weight:700; color:var(--accent-primary);">${Math.round(item.amount)} ${item.unit}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;

        // Add strike-through effect
        document.querySelectorAll('.ingredient-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                e.target.closest('.ingredient-item').classList.toggle('crossed', e.target.checked);
            };
        });
    };
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
        hideLoader();
    });

    document.getElementById('login-form').onsubmit = handleLoginSubmit;
    document.getElementById('onboarding-form').onsubmit = handleOnboardingSubmit;
    
    document.getElementById('mobile-menu-toggle').onclick = () => {
        document.getElementById('main-nav').classList.toggle('mobile-active');
        document.getElementById('mobile-menu-toggle').classList.toggle('open');
    };

    document.getElementById('btn-logout').onclick = () => _supabase.auth.signOut();
    document.getElementById('btn-close-modal').onclick = closeModal;
    document.getElementById('btn-regenerate').onclick = regeneratePlan;
    document.getElementById('btn-reset').onclick = resetProfile;

    // Navigation listeners
    document.getElementById('nav-dashboard').onclick = () => {
        document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-dashboard').classList.add('active');
        showView('dashboard');
    };
    document.getElementById('nav-calendar').onclick = () => {
        document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-calendar').classList.add('active');
        showView('calendar');
    };
    document.getElementById('nav-shopping').onclick = () => {
        document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-shopping').classList.add('active');
        showView('shopping');
    };
    document.getElementById('nav-profile').onclick = () => {
        document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
        document.getElementById('nav-profile').classList.add('active');
        showView('profile');
    };
});

// Global exposure for swap
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

window.openMealDetails = openMealDetails;
