// --- APP STATE ---
let appState = { user: null, plan: [] };
let currentUser = null; // Supabase auth user
let saveTimeout = null;
let sessionSkippedIds = []; // Ricette scartate in questa sessione


// --- DOM REFS ---
const navDashboard = document.getElementById('nav-dashboard');
const navShopping  = document.getElementById('nav-shopping');
const viewOnboarding = document.getElementById('view-onboarding');
const viewDashboard  = document.getElementById('view-dashboard');
const viewShopping   = document.getElementById('view-shopping');
const mainNav = document.getElementById('main-nav');

// ============================================================
// AUTH HELPERS
// ============================================================

function switchAuthTab(tab) {
    const submitBtn = document.getElementById('auth-submit');
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    submitBtn.textContent = tab === 'login' ? 'Accedi' : 'Registrati';
    document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email    = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const isLogin  = document.getElementById('tab-login').classList.contains('active');

    document.getElementById('auth-loading').style.display = 'block';
    document.getElementById('auth-submit').disabled = true;
    document.getElementById('auth-error').style.display = 'none';

    try {
        let result;
        if (isLogin) {
            result = await _supabase.auth.signInWithPassword({ email, password });
        } else {
            result = await _supabase.auth.signUp({ email, password });
            if (!result.error && result.data.user && !result.data.session) {
                // Email confirmation required
                document.getElementById('auth-loading').style.display = 'none';
                document.getElementById('auth-submit').disabled = false;
                showAuthError('✅ Registrazione avvenuta! Controlla la tua email per confermare l\'account, poi accedi.');
                return;
            }
        }

        if (result.error) {
            showAuthError(translateAuthError(result.error.message));
        }
        // Auth state listener will handle the rest on success
    } catch (err) {
        showAuthError('Errore di connessione. Riprova.');
    }

    document.getElementById('auth-loading').style.display = 'none';
    document.getElementById('auth-submit').disabled = false;
}

function translateAuthError(msg) {
    if (msg.includes('Invalid login credentials')) return '❌ Email o password errati.';
    if (msg.includes('Email not confirmed'))       return '📧 Conferma prima la tua email.';
    if (msg.includes('User already registered'))   return '⚠️ Email già registrata. Usa Accedi.';
    if (msg.includes('Password should be'))        return '⚠️ La password deve essere di almeno 6 caratteri.';
    return msg;
}

// ============================================================
// CLOUD SAVE / LOAD
// ============================================================

async function saveToCloud() {
    if (!currentUser) return;
    const payload = {
        id: currentUser.id,
        nutrition_profile: appState.user,
        meal_plan: appState.plan,
        updated_at: new Date().toISOString()
    };
    await _supabase.from('user_data').upsert(payload);
}

function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveToCloud, 1200);
}

async function loadFromCloud() {
    if (!currentUser) return false;
    const { data, error } = await _supabase
        .from('user_data')
        .select('nutrition_profile, meal_plan')
        .eq('id', currentUser.id)
        .single();

    if (error || !data || !data.nutrition_profile) return false;

    appState.user = data.nutrition_profile;
    if (!appState.user.bannedRecipeIds) appState.user.bannedRecipeIds = [];
    appState.plan = data.meal_plan || [];

    // Migrazione: se il piano è nel vecchio formato (usando 'day' invece di 'date')
    if (appState.plan.length > 0 && appState.plan[0].day !== undefined) {
        const today = getTodayISO();
        appState.plan = appState.plan.map((p, idx) => {
            const d = new Date(today + 'T00:00:00');
            d.setDate(d.getDate() + idx);
            const dateStr = d.toISOString().slice(0, 10);
            const newP = { date: dateStr, meals: p.meals };
            // Update instance IDs
            ['breakfast', 'snack', 'lunch'].forEach(t => {
                if (newP.meals[t]) newP.meals[t].mealInstanceId = `${dateStr}-${t}`;
            });
            return newP;
        });
    }

    ensurePlanCoversWindow();
    return true;
}

function ensurePlanCoversWindow() {
    if (!appState.user) return;
    const today = getTodayISO();
    const windowDays = 7;
    
    // Non rimuoviamo più i giorni vecchi per permettere lo storico nel calendario mensile
    // Teniamo tutto lo storico

    // Aggiungi giorni mancanti per coprire oggi + 6
    for (let i = 0; i < windowDays; i++) {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        
        if (!appState.plan.find(p => p.date === dateStr)) {
            const newDay = generateSingleDay(appState.user.targetCalories, appState.user.dislikes, appState.user.bannedRecipeIds);
            newDay.date = dateStr;
            // Set instance IDs
            ['breakfast', 'snack', 'lunch'].forEach(t => {
                if (newDay.meals[t]) newDay.meals[t].mealInstanceId = `${dateStr}-${t}`;
            });
            appState.plan.push(newDay);
        }
    }
    // Ordina per data
    appState.plan.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("NutriPlan: App Inizializzata");
    
    // Listen to auth state changes (login, logout, page load)
    _supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("NutriPlan: Auth State Change", event, session ? "Sessione attiva" : "Nessuna sessione");
        if (session && session.user) {
            currentUser = session.user;
            const hasData = await loadFromCloud();
            setupEventListeners();
            if (hasData) {
                showView('dashboard');
            } else {
                showView('onboarding');
            }
        } else {
            currentUser = null;
            appState = { user: null, plan: [] };
            setupEventListeners();
            showView('auth');
        }
    });

    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) onboardingForm.addEventListener('submit', handleOnboardingSubmit);
});

function setupEventListeners() {
    // Guard: don't add listeners twice
    if (document._listenersSetup) return;
    document._listenersSetup = true;

    navDashboard.addEventListener('click', () => showView('dashboard'));
    document.getElementById('nav-calendar').addEventListener('click', () => showView('calendar'));
    navShopping.addEventListener('click',  () => showView('shopping'));
    document.getElementById('nav-profile').addEventListener('click', () => showView('profile'));

    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await _supabase.auth.signOut();
        // onAuthStateChange will fire and redirect to auth view
    });

    document.getElementById('btn-close-modal').addEventListener('click', closeModal);

    document.getElementById('meal-modal').addEventListener('click', (e) => {
        if (e.target.id === 'meal-modal') closeModal();
    });

    document.getElementById('generate-shopping').addEventListener('click', generateShoppingList);

    document.getElementById('btn-regenerate').addEventListener('click', () => {
        if (confirm('Vuoi rigenerare il piano per i prossimi 7 giorni?')) {
            appState.plan = generateMonthlyPlan(appState.user.targetCalories, appState.user.dislikes, appState.user.bannedRecipeIds);
            debouncedSave();
            showView('dashboard');
        }
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
        if (confirm('Sei sicuro? Verranno cancellati tutti i tuoi dati e il piano attuale.')) {
            appState = { user: null, plan: [] };
            saveToCloud(); // saves empty
            showView('onboarding');
        }
    });
}

// ============================================================
// VIEW ROUTING
// ============================================================

function showView(viewName) {
    const allViews = ['view-auth','view-onboarding','view-dashboard','view-shopping','view-profile','view-calendar'];
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('active'); el.classList.add('hidden'); }
    });

    const allNavBtns = [navDashboard, navShopping, document.getElementById('nav-profile'), document.getElementById('nav-calendar')];
    allNavBtns.forEach(b => { if (b) b.classList.remove('active'); });

    if (viewName === 'auth') {
        document.getElementById('view-auth').classList.remove('hidden');
        document.getElementById('view-auth').classList.add('active');
        mainNav.classList.add('hidden');

    } else if (viewName === 'onboarding') {
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
        renderShoppingSelector();

    } else if (viewName === 'calendar') {
        const vc = document.getElementById('view-calendar');
        vc.classList.remove('hidden');
        vc.classList.add('active');
        document.getElementById('nav-calendar').classList.add('active');
        mainNav.classList.remove('hidden');
        renderMonthlyCalendar();

    } else if (viewName === 'profile') {
        const pv = document.getElementById('view-profile');
        pv.classList.remove('hidden');
        pv.classList.add('active');
        document.getElementById('nav-profile').classList.add('active');
        mainNav.classList.remove('hidden');
        renderProfile();
    }
}

// ============================================================
// ONBOARDING
// ============================================================

function handleOnboardingSubmit(e) {
    e.preventDefault();

    const age      = parseInt(document.getElementById('age').value);
    const gender   = document.getElementById('gender').value;
    const weight   = parseFloat(document.getElementById('weight').value);
    const height   = parseInt(document.getElementById('height').value);
    const activity = parseFloat(document.getElementById('activity').value);
    const goal     = document.getElementById('goal').value;
    const dislikes = document.getElementById('dislikes').value;

    const bmr            = calculateBMR(weight, height, age, gender);
    const tdee           = calculateTDEE(bmr, activity);
    const targetCalories = calculateTargetCalories(tdee, goal);

    appState.user = { age, gender, weight, height, activity, goal, dislikes, targetCalories, bannedRecipeIds: [] };
    appState.plan = generateMonthlyPlan(targetCalories, dislikes, []);

    debouncedSave();
    showView('dashboard');
}

// ============================================================
// DASHBOARD RENDERING
// ============================================================

function renderDashboard() {
    if (!appState.user) return;
    ensurePlanCoversWindow(); // Assicura che oggi sia coperto

    document.getElementById('caloric-info').innerHTML =
        'Fabbisogno calcolato: <span class="highlight">' + appState.user.targetCalories + ' kcal</span>/giorno';

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const today = getTodayISO();
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    visiblePlan.forEach(dayPlan => {
        let totalCals = 0;
        if (!dayPlan.meals.breakfast.excluded) totalCals += dayPlan.meals.breakfast.calories;
        if (!dayPlan.meals.lunch.excluded)     totalCals += dayPlan.meals.lunch.calories;
        if (dayPlan.meals.snack && !dayPlan.meals.snack.excluded) totalCals += dayPlan.meals.snack.calories;

        const card = document.createElement('div');
        card.className = 'day-card';
        if (dayPlan.date === today) card.classList.add('today');
        if (dayPlan.confirmed) card.classList.add('confirmed');

        const dateObj = new Date(dayPlan.date + 'T00:00:00');
        const options = { weekday: 'long', day: 'numeric', month: 'short' };
        const dateStr = dateObj.toLocaleDateString('it-IT', options);

        let mealsHtml = renderMealSlot(dayPlan.date, 'breakfast', dayPlan.meals.breakfast, dayPlan.confirmed);
        if (dayPlan.meals.snack) mealsHtml += renderMealSlot(dayPlan.date, 'snack', dayPlan.meals.snack, dayPlan.confirmed);
        mealsHtml += renderMealSlot(dayPlan.date, 'lunch', dayPlan.meals.lunch, dayPlan.confirmed);

        const confirmBtn = dayPlan.confirmed 
            ? `<button class="btn-unlock-day" onclick="unlockDay('${dayPlan.date}')">🔓 Sblocca Giorno</button>`
            : `<button class="btn-confirm-day" onclick="confirmDay('${dayPlan.date}')">✅ Conferma Giorno</button>`;

        card.innerHTML = '<div class="day-header"><h3>' + dateStr.charAt(0).toUpperCase() + dateStr.slice(1) + '</h3>'
            + '<span class="day-kcal">' + totalCals + ' kcal</span></div>'
            + mealsHtml
            + `<div class="day-footer">${confirmBtn}</div>`;
        grid.appendChild(card);
    });

    document.querySelectorAll('.btn-view-meal').forEach(btn => {
        btn.addEventListener('click', e => {
            openMealDetails(e.target.dataset.date, e.target.dataset.type);
        });
    });

    document.querySelectorAll('.btn-swap').forEach(btn => {
        btn.addEventListener('click', e => {
            swapMeal(e.target.dataset.date, e.target.dataset.type);
        });
    });

    document.querySelectorAll('.btn-ban').forEach(btn => {
        btn.addEventListener('click', e => {
            banRecipe(e.target.dataset.date, e.target.dataset.type);
        });
    });

    document.querySelectorAll('.exclude-checkbox').forEach(cb => {
        cb.addEventListener('change', e => {
            const date = e.target.dataset.date;
            const type = e.target.dataset.type;
            const idx  = appState.plan.findIndex(p => p.date === date);
            appState.plan[idx].meals[type].excluded = !e.target.checked;
            debouncedSave();
            renderDashboard();
        });
    });
}

function renderMealSlot(date, mealType, meal, isConfirmed) {
    const labels = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino' };
    const excludedClass  = meal.excluded ? 'excluded' : '';
    const checkedAttr    = meal.excluded ? '' : 'checked';
    const disabledAttr   = isConfirmed ? 'disabled' : '';

    let actionsHtml = '';
    if (!isConfirmed) {
        actionsHtml = '<div class="meal-actions">'
            + '<button class="btn-small btn-view-meal" data-date="' + date + '" data-type="' + mealType + '">Ricetta</button>'
            + '<button class="btn-small btn-swap" data-date="' + date + '" data-type="' + mealType + '">Cambia</button>'
            + '<button class="btn-small btn-ban" data-date="' + date + '" data-type="' + mealType + '" title="Non propormi più questa ricetta" style="color:#f87171; border-color:rgba(239,68,68,0.2);">🚫</button>'
            + '</div>';
    } else {
        actionsHtml = '<div class="meal-actions">'
            + '<button class="btn-small btn-view-meal" data-date="' + date + '" data-type="' + mealType + '">Ricetta</button>'
            + '<span class="confirmed-label">Confermato</span>'
            + '</div>';
    }

    return '<div class="meal-slot ' + excludedClass + '">'
        + '<div class="meal-type"><span>' + labels[mealType] + '</span><span>' + meal.calories + ' kcal</span></div>'
        + '<div class="meal-name">' + meal.name + '</div>'
        + '<div class="meal-macros"><span>P: ' + meal.macros.protein + 'g</span><span>C: ' + meal.macros.carbs + 'g</span><span>G: ' + meal.macros.fat + 'g</span></div>'
        + '<div class="meal-toggle"><input type="checkbox" class="exclude-checkbox" data-date="' + date + '" data-type="' + mealType + '" ' + checkedAttr + ' ' + disabledAttr + '><label>Includi Pasto</label></div>'
        + actionsHtml
        + '</div>';
}

// ============================================================
// MEAL DETAIL MODAL
// ============================================================

function openMealDetails(date, mealType) {
    const dayPlan = appState.plan.find(p => p.date === date);
    const meal    = dayPlan.meals[mealType];
    const labels  = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino' };

    const dateObj = new Date(date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });

    let html = '';
    
    // Header Image (if available)
    if (meal.imageUrl) {
        html += `<img src="${meal.imageUrl}" class="recipe-header-img" alt="${meal.name}">`;
    }

    html += `<div class="recipe-body">
        <div class="meal-type" style="color:var(--accent-primary); font-weight:700; margin-bottom:0.5rem;">${labels[mealType].toUpperCase()}</div>
        <h2 style="font-size:1.8rem; margin-bottom:1.5rem;">${meal.name}</h2>
        
        <div class="recipe-meta">
            <div class="meta-item">
                <span class="label">Energia</span>
                <span class="value">${meal.calories} kcal</span>
            </div>
            <div class="meta-item">
                <span class="label">Proteine</span>
                <span class="value">${meal.macros.protein}g</span>
            </div>
            <div class="meta-item">
                <span class="label">Carboidrati</span>
                <span class="value">${meal.macros.carbs}g</span>
            </div>
            <div class="meta-item">
                <span class="label">Grassi</span>
                <span class="value">${meal.macros.fat}g</span>
            </div>
        </div>

        <div class="recipe-section">
            <h4><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Ingredienti</h4>
            <div style="display:grid; gap:0.5rem;">
                ${meal.ingredients.map(i => `
                    <div class="ingredient-check-item">
                        <span style="font-weight:600; color:var(--accent-primary); min-width:60px;">${i.amount}${i.unit}</span>
                        <span>${i.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="recipe-section">
            <h4><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Preparazione</h4>
            <ol style="line-height:1.8;">
                ${meal.instructions.map(s => `<li>${s}</li>`).join('')}
            </ol>
        </div>`;

    if (meal.sourceUrl && meal.sourceUrl.length > 30) {
        html += `<div style="margin-top:2rem; padding:1.5rem; background:rgba(255,255,255,0.03); border-radius:12px; text-align:center;">
            <a href="${meal.sourceUrl}" target="_blank" style="color:var(--accent-primary); text-decoration:none; font-weight:700; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Ricetta Originale
            </a>
        </div>`;
    }
    
    html += `</div>`; // Close recipe-body

    document.getElementById('meal-details').innerHTML = html;
    document.getElementById('meal-modal').classList.remove('hidden');
    // Ensure modal scroll is at top
    document.querySelector('#meal-modal .modal-content').scrollTop = 0;
}

function closeModal() { document.getElementById('meal-modal').classList.add('hidden'); }

// ============================================================
// SWAP MEAL
// ============================================================

function swapMeal(date, mealType) {
    const idx     = appState.plan.findIndex(p => p.date === date);
    if (appState.plan[idx].confirmed) return; // Non cambiare se confermato

    const current = appState.plan[idx].meals[mealType];
    
    // Aggiungiamo l'attuale a quelli da evitare in questa sessione
    if (!sessionSkippedIds.includes(current.id)) {
        sessionSkippedIds.push(current.id);
        // Limitiamo la coda a 15 elementi per non svuotare troppo il pool
        if (sessionSkippedIds.length > 15) sessionSkippedIds.shift();
    }

    const alt = findAlternativeMeal(current, appState.user.dislikes, current.calories, appState.user.bannedRecipeIds, sessionSkippedIds);
    if (alt) {
        alt.excluded = false;
        appState.plan[idx].meals[mealType] = Object.assign({}, alt, { mealInstanceId: date + '-' + mealType + '-' + Date.now() });
        debouncedSave();
        renderDashboard();
    } else {
        alert('Nessuna alternativa trovata nel database.');
    }
}

function confirmDay(date) {
    const idx = appState.plan.findIndex(p => p.date === date);
    if (idx !== -1) {
        appState.plan[idx].confirmed = true;
        debouncedSave();
        renderDashboard();
    }
}

function unlockDay(date) {
    const idx = appState.plan.findIndex(p => p.date === date);
    if (idx !== -1) {
        appState.plan[idx].confirmed = false;
        debouncedSave();
        renderDashboard();
    }
}

function banRecipe(date, mealType) {
    const idx = appState.plan.findIndex(p => p.date === date);
    const meal = appState.plan[idx].meals[mealType];
    if (confirm(`Non ti piace "${meal.name}"? Non te la proporremo più.`)) {
        if (!appState.user.bannedRecipeIds.includes(meal.id)) {
            appState.user.bannedRecipeIds.push(meal.id);
        }
        swapMeal(date, mealType); // Sostituisci subito
    }
}

// ============================================================
// PROFILE PAGE
// ============================================================

function renderProfile() {
    if (!appState.user) return;
    const u = appState.user;
    const actLabels  = { '1.2': 'Sedentario', '1.375': 'Leggero', '1.55': 'Moderato', '1.725': 'Attivo' };
    const goalLabels = { lose: 'Perdita di peso', maintain: 'Mantenimento', gain: 'Aumento massa' };
    const bmiData    = calculateBMI(u.weight, u.height);
    const userEmail  = currentUser ? currentUser.email : '';

    let html = '<p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem;">Account: <strong style="color:var(--accent-primary);">' + userEmail + '</strong></p>'
        + '<div class="profile-grid">'
        + profileEditCard('Età', u.age, 'number', 'age')
        + profileEditCard('Peso (kg)', u.weight, 'number', 'weight')
        + profileEditCard('Altezza (cm)', u.height, 'number', 'height')
        + profileEditCard('Livello Attività', actLabels[u.activity] || u.activity, 'select', 'activity', actLabels)
        + profileEditCard('Obiettivo', goalLabels[u.goal] || u.goal, 'select', 'goal', goalLabels)
        + '</div>'
        + '<div class="profile-summary-cards">'
        + profileCard('BMI', bmiData.bmi + ' (' + bmiData.category + ')', true)
        + profileCard('TARGET CALORICO', u.targetCalories + ' kcal/giorno', true)
        + '</div>'
        + '<div style="margin-top:1.5rem;">'
        + '<label style="display:block;margin-bottom:0.5rem;">Cibi Esclusi (separati da virgola)</label>'
        + '<div style="display:flex;gap:0.5rem;">'
        + '<input type="text" id="edit-dislikes" value="' + (u.dislikes || '') + '" style="flex:1;">'
        + '<button class="btn btn-small" onclick="updateProfileField(\'dislikes\', document.getElementById(\'edit-dislikes\').value)">Salva</button>'
        + '</div></div>';

    document.getElementById('profile-data').innerHTML = html;
}

function profileEditCard(label, value, type, field, options) {
    return '<div class="profile-edit-card">'
        + '<div class="label">' + label + '</div>'
        + '<div class="value-row">'
        + '<span class="value">' + value + '</span>'
        + '<button class="btn-edit-inline" onclick="showInlineEdit(this, \'' + field + '\', \'' + type + '\')">✏️</button>'
        + '</div>'
        + '</div>';
}

function showInlineEdit(btn, field, type) {
    const row = btn.closest('.value-row');
    const oldValue = row.querySelector('.value').textContent;
    let inputHtml = '';

    if (field === 'activity') {
        inputHtml = '<select id="inline-edit-' + field + '">'
            + '<option value="1.2">Sedentario</option>'
            + '<option value="1.375">Leggero</option>'
            + '<option value="1.55">Moderato</option>'
            + '<option value="1.725">Attivo</option>'
            + '</select>';
    } else if (field === 'goal') {
        inputHtml = '<select id="inline-edit-' + field + '">'
            + '<option value="lose">Perdita peso</option>'
            + '<option value="maintain">Mantenimento</option>'
            + '<option value="gain">Aumento massa</option>'
            + '</select>';
    } else {
        inputHtml = '<input type="' + type + '" id="inline-edit-' + field + '" value="' + parseFloat(oldValue) + '">';
    }

    row.innerHTML = inputHtml + '<button class="btn-save-inline" onclick="updateProfileField(\'' + field + '\', document.getElementById(\'inline-edit-' + field + '\').value)">✓</button>';
}

function updateProfileField(field, value) {
    if (field === 'weight' || field === 'height' || field === 'age' || field === 'activity') {
        appState.user[field] = parseFloat(value);
    } else {
        appState.user[field] = value;
    }

    // Ricalcola targetCalories
    const bmr = calculateBMR(appState.user.weight, appState.user.height, appState.user.age, appState.user.gender);
    const tdee = calculateTDEE(bmr, appState.user.activity);
    appState.user.targetCalories = calculateTargetCalories(tdee, appState.user.goal);

    debouncedSave();
    renderProfile();
}

function profileCard(label, value, accent) {
    return '<div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:1rem;border:1px solid rgba(255,255,255,0.05);">'
        + '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">' + label + '</div>'
        + '<div style="font-size:1.1rem;font-weight:700;' + (accent ? 'color:var(--accent-primary);' : '') + '">' + value + '</div>'
        + '</div>';
}

function renderShoppingSelector() {
    const container = document.getElementById('shopping-days-selector');
    if (!container || !appState.plan) return;
    
    container.innerHTML = '';
    const today = getTodayISO();
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    visiblePlan.forEach(p => {
        const dateObj = new Date(p.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'short' });
        const dayNum  = dateObj.getDate();
        
        const label = document.createElement('label');
        label.style = "display: flex; align-items: center; gap: 0.5rem; cursor: pointer; background: rgba(255,255,255,0.05); padding: 0.5rem 0.8rem; border-radius: 8px; border: 1px solid var(--glass-border);";
        label.innerHTML = `<input type="checkbox" class="day-checkbox" value="${p.date}" checked> ${dayName} ${dayNum}`;
        container.appendChild(label);
    });
}

function generateShoppingList() {
    const selectedDates = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => cb.value);
    if (selectedDates.length === 0) {
        document.getElementById('shopping-list-content').innerHTML = '<p class="text-center text-muted">Seleziona almeno un giorno.</p>';
        return;
    }

    const daysToShop = appState.plan.filter(p => selectedDates.includes(p.date));
    const categories = {};

    daysToShop.forEach(dayPlan => {
        const add = meal => {
            if (!meal || meal.excluded) return;
            meal.ingredients.forEach(ing => {
                const cat = ing.category || 'Altro';
                if (!categories[cat]) categories[cat] = {};
                if (!categories[cat][ing.name]) categories[cat][ing.name] = { name: ing.name, amount: 0, unit: ing.unit };
                categories[cat][ing.name].amount += ing.amount;
            });
        };
        add(dayPlan.meals.breakfast);
        if (dayPlan.meals.snack) add(dayPlan.meals.snack);
        add(dayPlan.meals.lunch);
    });

    if (Object.keys(categories).length === 0) {
        document.getElementById('shopping-list-content').innerHTML = '<p class="text-center text-muted">Nessun ingrediente trovato.</p>';
        return;
    }

    const icons = { 'Ortofrutta': '🥬', 'Carne e Pesce': '🥩', 'Latticini': '🧀', 'Dispensa': '🥫', 'Panetteria': '🍞', 'Altro': '🛒' };
    
    let html = '<h3 style="margin-bottom:1.5rem;text-align:center;">Lista della Spesa</h3>';
    html += '<p class="text-center text-muted" style="margin-bottom:2rem;font-size:0.9rem;">Ingredienti combinati per i giorni selezionati.</p>';

    Object.keys(categories).sort().forEach(cat => {
        html += '<div class="category-section" style="margin-bottom:2rem;">'
            + '<h4 style="color:var(--accent-primary);border-bottom:1px solid var(--glass-border);padding-bottom:0.5rem;margin-bottom:1rem;">'
            + (icons[cat] || '🛒') + ' ' + cat + '</h4><ul class="ingredient-list">';

        Object.values(categories[cat]).sort((a,b) => a.name.localeCompare(b.name)).forEach((item, i) => {
            const uid = ('ing-' + cat + '-' + i).replace(/\s+/g, '-');
            html += '<li class="ingredient-item"><div style="display:flex;align-items:center;">'
                + '<input type="checkbox" class="ingredient-checkbox" id="' + uid + '">'
                + '<label for="' + uid + '" style="font-weight:500;cursor:pointer;">' + item.name + '</label></div>'
                + '<span style="color:var(--accent-primary);">' + Math.round(item.amount) + ' ' + item.unit + '</span></li>';
        });
        html += '</ul></div>';
    });

    document.getElementById('shopping-list-content').innerHTML = html;

    document.querySelectorAll('.ingredient-checkbox').forEach(cb => {
        cb.addEventListener('change', e => {
            e.target.closest('.ingredient-item').classList.toggle('crossed', e.target.checked);
        });
    });
}

// ============================================================
// MONTHLY CALENDAR
// ============================================================

function renderMonthlyCalendar() {
    const container = document.getElementById('monthly-calendar-container');
    if (!container) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    
    // Header con mese
    let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h3>${monthNames[currentMonth]} ${currentYear}</h3>
    </div>`;

    // Griglia giorni
    html += `<div class="calendar-month-grid" style="display:grid; grid-template-columns: repeat(7, 1fr); gap: 2px; background:var(--glass-border); border:1px solid var(--glass-border); border-radius:8px; overflow:hidden;">`;
    
    // Header giorni settimana
    const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
    weekDays.forEach(wd => {
        html += `<div style="background:rgba(0,0,0,0.3); padding:0.5rem; text-align:center; font-size:0.75rem; font-weight:700; color:var(--text-secondary);">${wd}</div>`;
    });

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const emptySlots = (firstDayOfMonth === 0 ? 7 : firstDayOfMonth) - 1; // Adjust to Monday start
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Slot vuoti inizio mese
    for (let i = 0; i < emptySlots; i++) {
        html += `<div style="background:rgba(255,255,255,0.02); min-height:80px;"></div>`;
    }

    const todayStr = getTodayISO();

    // Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPlan = appState.plan.find(p => p.date === dateStr);
        const isToday = dateStr === todayStr;
        
        let dayStyle = `background:rgba(0,0,0,0.2); min-height:100px; padding:0.5rem; display:flex; flex-direction:column; gap:0.25rem; border: 1px solid transparent;`;
        if (isToday) dayStyle += `border-color:var(--accent-primary); background:rgba(16, 185, 129, 0.05);`;

        html += `<div style="${dayStyle}">
            <div style="font-size:0.7rem; font-weight:700; color:${isToday ? 'var(--accent-primary)' : 'var(--text-secondary)'}; margin-bottom:0.25rem;">${day}</div>`;
        
        if (dayPlan) {
            html += `<div style="font-size:0.6rem; background:rgba(16, 185, 129, 0.1); color:#4ade80; padding:2px 4px; border-radius:4px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;" onclick="openMealDetails('${dateStr}', 'breakfast')">☕ ${dayPlan.meals.breakfast.name}</div>`;
            html += `<div style="font-size:0.6rem; background:rgba(59, 130, 246, 0.1); color:#60a5fa; padding:2px 4px; border-radius:4px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; cursor:pointer;" onclick="openMealDetails('${dateStr}', 'lunch')">🍝 ${dayPlan.meals.lunch.name}</div>`;
            if (dayPlan.confirmed) {
                html += `<div style="font-size:0.5rem; text-align:right; color:#4ade80; margin-top:auto;">✅</div>`;
            }
        }
        
        html += `</div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// Rimozione funzioni QR obsolete
