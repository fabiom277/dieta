// --- APP STATE ---
let appState = { user: null, plan: [] };
let currentUser = null; // Supabase auth user
let saveTimeout = null;
let sessionSkippedIds = []; // Ricette scartate in questa sessione
let recipesLoaded = false;


// --- DOM REFS ---
let navDashboard, navShopping, viewOnboarding, viewDashboard, viewShopping, mainNav;

function initDomRefs() {
    navDashboard = document.getElementById('nav-dashboard');
    navShopping  = document.getElementById('nav-shopping');
    viewOnboarding = document.getElementById('view-onboarding');
    viewDashboard  = document.getElementById('view-dashboard');
    viewShopping   = document.getElementById('view-shopping');
    mainNav = document.getElementById('main-nav');
}

// ============================================================
// AUTH HELPERS
// ============================================================



function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

function switchAuthTab(type) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const errorEl = document.getElementById('auth-error');

    if (errorEl) errorEl.style.display = 'none';

    if (type === 'login') {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
    } else {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const isLogin = e.target.id === 'login-form';
    const email    = document.getElementById(isLogin ? 'login-email' : 'register-email').value.trim();
    const password = document.getElementById(isLogin ? 'login-password' : 'register-password').value;

    const loadingEl = document.getElementById('auth-loading');
    const errorEl   = document.getElementById('auth-error');
    const submitBtn = document.getElementById(isLogin ? 'login-submit' : 'register-submit');

    if (loadingEl) loadingEl.style.display = 'block';
    if (submitBtn) submitBtn.disabled = true;
    if (errorEl) errorEl.style.display = 'none';

    try {
        let result;
        if (isLogin) {
            result = await _supabase.auth.signInWithPassword({ email, password });
        } else {
            result = await _supabase.auth.signUp({ email, password });
            if (!result.error && result.data.user && !result.data.session) {
                if (loadingEl) loadingEl.style.display = 'none';
                if (submitBtn) submitBtn.disabled = false;
                showAuthError('✅ Registrazione avvenuta! Controlla la tua email per confermare l\'account, poi accedi.');
                return;
            }
        }

        if (result.error) {
            showAuthError(translateAuthError(result.error.message));
        }
    } catch (err) {
        showAuthError('Errore di connessione. Riprova.');
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
    }
}

function translateAuthError(msg) {
    if (msg.includes('Invalid login credentials')) return '❌ Email o password errati.';
    if (msg.includes('Email not confirmed'))       return '📧 Conferma prima la tua email.';
    if (msg.includes('User already registered'))   return '⚠️ Email già registrata. Usa Accedi.';
    if (msg.includes('Password should be'))        return '⚠️ La password deve essere di almeno 6 caratteri.';
    return msg;
}

// ============================================================
// DATA LOADING
// ============================================================

async function fetchRecipesFromSupabase() {
    console.log("NutriPlan: Caricamento ricette da Supabase...");
    try {
        const { data, error } = await _supabase
            .from('recipes')
            .select('*');

        if (error) throw error;

        // Normalizzazione dati per il frontend (snake_case -> camelCase)
        const normalized = data.map(r => ({
            ...r,
            baseCalories: r.base_calories,
            imageUrl: r.image_url,
            sourceUrl: r.source_url
        }));

        recipesDB = normalized.filter(r => r.type !== 'snack');
        snacksDB = normalized.filter(r => r.type === 'snack');

        console.log(`NutriPlan: ${data.length} ricette caricate con successo.`);
        recipesLoaded = true;
        return true;
    } catch (err) {
        console.error("NutriPlan: Errore nel caricamento ricette:", err);
        return false;
    }
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
    console.log("NutriPlan: Caricamento dati da Cloud per UID:", currentUser.id);
    
    try {
        const { data, error } = await _supabase
            .from('user_data')
            .select('nutrition_profile, meal_plan')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log("NutriPlan: Nessun dato trovato per l'utente, avvio onboarding.");
                return false;
            }
            throw error;
        }

        if (!data || !data.nutrition_profile) {
            console.log("NutriPlan: Profilo mancante, avvio onboarding.");
            return false;
        }

        appState.user = data.nutrition_profile;
        if (!appState.user.bannedRecipeIds) appState.user.bannedRecipeIds = [];
        appState.plan = data.meal_plan || [];

        console.log("NutriPlan: Dati caricati. Giorni nel piano:", appState.plan.length);

        // --- SINCRONIZZAZIONE RICETTE ---
        if (appState.plan.length > 0) {
            appState.plan.forEach(day => {
                if (day && day.meals) {
                    ['breakfast', 'snack', 'lunch'].forEach(slot => {
                        if (day.meals[slot]) {
                            const currentMeal = day.meals[slot];
                            // Cerca nel DB locale (gestisce snacksDB se separato)
                            // Usiamo String() per confronto sicuro tra ID numerici e stringhe (es. vecchi l26)
                            let updated = recipesDB.find(r => String(r.id) === String(currentMeal.id)) || 
                                          (typeof snacksDB !== 'undefined' ? snacksDB.find(r => String(r.id) === String(currentMeal.id)) : null);
                            
                            if (updated) {
                                const isExcluded = currentMeal.excluded;
                                const instanceId = currentMeal.mealInstanceId;
                                day.meals[slot] = JSON.parse(JSON.stringify(updated));
                                day.meals[slot].excluded = isExcluded;
                                day.meals[slot].mealInstanceId = instanceId;
                                day.meals[slot].calories = updated.baseCalories;
                            }
                        }
                    });
                }
            });
        }

        // Migrazione formati vecchi
        if (appState.plan.length > 0 && appState.plan[0].day !== undefined) {
            console.log("NutriPlan: Eseguo migrazione formato piano...");
            const today = getTodayISO();
            appState.plan = appState.plan.map((p, idx) => {
                const d = new Date(today + 'T00:00:00');
                d.setDate(d.getDate() + idx);
                const dateStr = d.toISOString().slice(0, 10);
                const newP = { date: dateStr, meals: p.meals };
                ['breakfast', 'snack', 'lunch'].forEach(t => {
                    if (newP.meals[t]) newP.meals[t].mealInstanceId = `${dateStr}-${t}`;
                });
                return newP;
            });
        }

        ensurePlanCoversWindow();
        return true;
    } catch (err) {
        console.error("NutriPlan: Errore durante loadFromCloud:", err);
        return false;
    }
}

function ensurePlanCoversWindow() {
    if (!appState.user) return;
    const today = getTodayISO();
    const windowDays = 7;
    
    let added = 0;
    for (let i = 0; i < windowDays; i++) {
        const d = new Date(today + 'T00:00:00');
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        
        if (!appState.plan.find(p => p.date === dateStr)) {
            const newDay = generateSingleDay(appState.user.targetCalories, appState.user.dislikes, appState.user.bannedRecipeIds);
            newDay.date = dateStr;
            ['breakfast', 'snack', 'lunch'].forEach(t => {
                if (newDay.meals && newDay.meals[t]) newDay.meals[t].mealInstanceId = `${dateStr}-${t}`;
            });
            appState.plan.push(newDay);
            added++;
        }
    }
    if (added > 0) {
        console.log(`NutriPlan: Aggiunti ${added} nuovi giorni al piano.`);
        appState.plan.sort((a, b) => a.date.localeCompare(b.date));
        debouncedSave();
    }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("NutriPlan: App Inizializzata (DOM Ready)");
    
    initDomRefs();

    // Fallback di sicurezza: rimuove SEMPRE il loader globale dopo 4 secondi.
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader && loader.style.display !== 'none') {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 4000);

    async function handleAuthChange(event, session) {
        console.log("NutriPlan: Auth Event ->", event);
        
        if (session && session.user) {
            currentUser = session.user;
            
            if (!recipesLoaded) {
                await fetchRecipesFromSupabase();
            }

            setupEventListeners();
            const hasData = await loadFromCloud();
            
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
        
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }

    _supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuthChange('INITIAL_SESSION_MANUAL', session);
    });

    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return;
        handleAuthChange(event, session);
    });

    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) onboardingForm.addEventListener('submit', handleOnboardingSubmit);

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const mainNavEl = document.getElementById('main-nav');
    if (menuToggle && mainNavEl) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('open');
            mainNavEl.classList.toggle('mobile-active');
        });
    }
});

function toggleMobileMenu(forceClose = false) {
    const menuToggle = document.getElementById('mobile-menu-toggle');
    const mainNavEl = document.getElementById('main-nav');
    if (menuToggle && mainNavEl) {
        if (forceClose) {
            menuToggle.classList.remove('open');
            mainNavEl.classList.remove('mobile-active');
        } else {
            menuToggle.classList.toggle('open');
            mainNavEl.classList.toggle('mobile-active');
        }
    }
}

/**
 * Funzione di emergenza per resettare l'app se bloccata (utilizzabile dalla console o link)
 */
async function resetAppSession() {
    await _supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

function setupEventListeners() {
    if (document._listenersSetup) return;
    document._listenersSetup = true;

    if (navDashboard) navDashboard.addEventListener('click', () => showView('dashboard'));
    const navCal = document.getElementById('nav-calendar');
    if (navCal) navCal.addEventListener('click', () => showView('calendar'));
    if (navShopping) navShopping.addEventListener('click',  () => showView('shopping'));
    const navProf = document.getElementById('nav-profile');
    if (navProf) navProf.addEventListener('click', () => showView('profile'));

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleAuthSubmit);
    
    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleAuthSubmit);

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', async () => {
        await _supabase.auth.signOut();
    });

    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

    const mealModal = document.getElementById('meal-modal');
    if (mealModal) mealModal.addEventListener('click', (e) => {
        if (e.target.id === 'meal-modal') closeModal();
    });

    const btnGenShop = document.getElementById('generate-shopping');
    if (btnGenShop) btnGenShop.addEventListener('click', generateShoppingList);

    const btnRegen = document.getElementById('btn-regenerate');
    if (btnRegen) btnRegen.addEventListener('click', () => {
        if (confirm('Vuoi rigenerare il piano per i prossimi 7 giorni?')) {
            appState.plan = generateMonthlyPlan(appState.user.targetCalories, appState.user.dislikes, appState.user.bannedRecipeIds);
            debouncedSave();
            showView('dashboard');
        }
    });

    const btnReset = document.getElementById('btn-reset');
    if (btnReset) btnReset.addEventListener('click', () => {
        if (confirm('Sei sicuro? Verranno cancellati tutti i tuoi dati e il piano attuale.')) {
            appState = { user: null, plan: [] };
            saveToCloud();
            showView('onboarding');
        }
    });
}

// ============================================================
// VIEW ROUTING
// ============================================================

function showView(viewName) {
    // Chiudi il menu mobile se aperto
    toggleMobileMenu(true);

    const allViews = ['view-auth','view-onboarding','view-dashboard','view-shopping','view-profile','view-calendar'];
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('active'); el.classList.add('hidden'); }
    });

    const allNavBtns = [navDashboard, navShopping, document.getElementById('nav-profile'), document.getElementById('nav-calendar')];
    allNavBtns.forEach(b => { if (b) b.classList.remove('active'); });

    if (viewName === 'auth') {
        const v = document.getElementById('view-auth');
        if (v) { v.classList.remove('hidden'); v.classList.add('active'); }
        if (mainNav) mainNav.classList.add('hidden');

    } else if (viewName === 'onboarding') {
        if (viewOnboarding) { viewOnboarding.classList.remove('hidden'); viewOnboarding.classList.add('active'); }
        if (mainNav) mainNav.classList.add('hidden');

    } else if (viewName === 'dashboard') {
        if (viewDashboard) { viewDashboard.classList.remove('hidden'); viewDashboard.classList.add('active'); }
        if (navDashboard) navDashboard.classList.add('active');
        if (mainNav) mainNav.classList.remove('hidden');
        renderDashboard();

    } else if (viewName === 'shopping') {
        if (viewShopping) { viewShopping.classList.remove('hidden'); viewShopping.classList.add('active'); }
        if (navShopping) navShopping.classList.add('active');
        if (mainNav) mainNav.classList.remove('hidden');
        renderShoppingSelector();

    } else if (viewName === 'calendar') {
        const vc = document.getElementById('view-calendar');
        if (vc) { vc.classList.remove('hidden'); vc.classList.add('active'); }
        const nc = document.getElementById('nav-calendar');
        if (nc) nc.classList.add('active');
        if (mainNav) mainNav.classList.remove('hidden');
        renderMonthlyCalendar();

    } else if (viewName === 'profile') {
        const pv = document.getElementById('view-profile');
        if (pv) { pv.classList.remove('hidden'); pv.classList.add('active'); }
        const np = document.getElementById('nav-profile');
        if (np) np.classList.add('active');
        if (mainNav) mainNav.classList.remove('hidden');
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
    try {
        ensurePlanCoversWindow();

        const calInfo = document.getElementById('caloric-info');
        if (calInfo) calInfo.innerHTML = 'Fabbisogno calcolato: <span class="highlight">' + appState.user.targetCalories + ' kcal</span>/giorno';

        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const today = getTodayISO();
        const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

        if (visiblePlan.length === 0) {
            grid.innerHTML = '<p class="text-center text-muted" style="grid-column: 1/-1;">Nessun piano generato. Prova a rigenerare dal profilo.</p>';
            return;
        }

        visiblePlan.forEach(dayPlan => {
            let totalCals = 0;
            if (dayPlan.meals.breakfast && !dayPlan.meals.breakfast.excluded) totalCals += dayPlan.meals.breakfast.calories || 0;
            if (dayPlan.meals.lunch && !dayPlan.meals.lunch.excluded)     totalCals += dayPlan.meals.lunch.calories || 0;
            if (dayPlan.meals.snack && !dayPlan.meals.snack.excluded) totalCals += dayPlan.meals.snack.calories || 0;

            const card = document.createElement('div');
            card.className = 'day-card';
            if (dayPlan.date === today) card.classList.add('today');
            if (dayPlan.confirmed) card.classList.add('confirmed');

            const dateObj = new Date(dayPlan.date + 'T00:00:00');
            const options = { weekday: 'long', day: 'numeric', month: 'short' };
            const dateStr = dateObj.toLocaleDateString('it-IT', options);

            let mealsHtml = '';
            if (dayPlan.meals.breakfast) mealsHtml += renderMealSlot(dayPlan.date, 'breakfast', dayPlan.meals.breakfast, dayPlan.confirmed);
            if (dayPlan.meals.snack)     mealsHtml += renderMealSlot(dayPlan.date, 'snack', dayPlan.meals.snack, dayPlan.confirmed);
            if (dayPlan.meals.lunch)     mealsHtml += renderMealSlot(dayPlan.date, 'lunch', dayPlan.meals.lunch, dayPlan.confirmed);

            const confirmBtn = dayPlan.confirmed 
                ? `<button class="btn-unlock-day" onclick="unlockDay('${dayPlan.date}')">🔓 Sblocca Giorno</button>`
                : `<button class="btn-confirm-day" onclick="confirmDay('${dayPlan.date}')">✅ Conferma Giorno</button>`;

            card.innerHTML = '<div class="day-header"><h3>' + dateStr.charAt(0).toUpperCase() + dateStr.slice(1) + '</h3>'
                + '<span class="day-kcal">' + totalCals + ' kcal</span></div>'
                + mealsHtml
                + `<div class="day-footer">${confirmBtn}</div>`;
            grid.appendChild(card);
        });

        setupDashboardInteractions();
    } catch (err) {
        console.error("NutriPlan: Errore durante renderDashboard:", err);
    }
}

function setupDashboardInteractions() {
    document.querySelectorAll('.btn-view-meal').forEach(btn => {
        btn.onclick = (e) => openMealDetails(e.target.dataset.date, e.target.dataset.type);
    });

    document.querySelectorAll('.btn-swap').forEach(btn => {
        btn.onclick = (e) => swapMeal(e.target.dataset.date, e.target.dataset.type);
    });

    document.querySelectorAll('.btn-ban').forEach(btn => {
        btn.onclick = (e) => banRecipe(e.target.dataset.date, e.target.dataset.type);
    });

    document.querySelectorAll('.exclude-checkbox').forEach(cb => {
        cb.onchange = (e) => {
            const date = e.target.dataset.date;
            const type = e.target.dataset.type;
            const idx  = appState.plan.findIndex(p => p.date === date);
            if (idx !== -1) {
                appState.plan[idx].meals[type].excluded = !e.target.checked;
                debouncedSave();
                renderDashboard();
            }
        };
    });
}

function renderMealSlot(date, mealType, meal, isConfirmed) {
    if (!meal) return '';
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
        + '<div class="meal-type"><span>' + labels[mealType] + '</span><span>' + (meal.calories || 0) + ' kcal</span></div>'
        + '<div class="meal-name">' + (meal.name || 'Pasto') + '</div>'
        + '<div class="meal-macros"><span>P: ' + (meal.macros?.protein || 0) + 'g</span><span>C: ' + (meal.macros?.carbs || 0) + 'g</span><span>G: ' + (meal.macros?.fat || 0) + 'g</span></div>'
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

    let html = '';
    if (meal.imageUrl) {
        html += `<img src="${meal.imageUrl}" class="recipe-header-img" alt="${meal.name}">`;
    }

    html += `<div class="recipe-body">
        <div class="meal-type" style="color:var(--accent-primary); font-weight:700; margin-bottom:0.5rem;">${labels[mealType].toUpperCase()}</div>
        <h2 style="font-size:1.8rem; margin-bottom:1.5rem;">${meal.name}</h2>
        
        <div class="recipe-meta">
            <div class="meta-item"><span class="label">Energia</span><span class="value">${meal.calories} kcal</span></div>
            <div class="meta-item"><span class="label">Proteine</span><span class="value">${meal.macros?.protein || 0}g</span></div>
            <div class="meta-item"><span class="label">Carboidrati</span><span class="value">${meal.macros?.carbs || 0}g</span></div>
            <div class="meta-item"><span class="label">Grassi</span><span class="value">${meal.macros?.fat || 0}g</span></div>
        </div>

        <div class="recipe-section">
            <h4>Ingredienti</h4>
            <div style="display:grid; gap:0.5rem;">
                ${meal.ingredients ? meal.ingredients.map(i => `
                    <div class="ingredient-check-item">
                        <span style="font-weight:600; color:var(--accent-primary); min-width:60px;">${i.amount}${i.unit}</span>
                        <span>${i.name}</span>
                    </div>
                `).join('') : ''}
            </div>
        </div>

        <div class="recipe-section">
            <h4>Preparazione</h4>
            <ol style="line-height:1.8;">
                ${meal.instructions ? meal.instructions.map(s => `<li>${s}</li>`).join('') : ''}
            </ol>
        </div>`;

    if (meal.sourceUrl && meal.sourceUrl.length > 10) {
        html += `<div class="recipe-source-container">
            <a href="${meal.sourceUrl}" target="_blank" class="recipe-source-link">Ricetta Originale</a>
        </div>`;
    }
    
    html += `</div>`;

    document.getElementById('meal-details').innerHTML = html;
    document.getElementById('meal-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() { 
    document.getElementById('meal-modal').classList.add('hidden'); 
    document.body.style.overflow = '';
}

// ============================================================
// SWAP MEAL
// ============================================================

function swapMeal(date, mealType) {
    const idx = appState.plan.findIndex(p => p.date === date);
    if (appState.plan[idx].confirmed) return;

    const current = appState.plan[idx].meals[mealType];
    if (!sessionSkippedIds.includes(current.id)) {
        sessionSkippedIds.push(current.id);
        if (sessionSkippedIds.length > 15) sessionSkippedIds.shift();
    }

    const alt = findAlternativeMeal(current, appState.user.dislikes, current.calories, appState.user.bannedRecipeIds, sessionSkippedIds);
    if (alt) {
        alt.excluded = false;
        appState.plan[idx].meals[mealType] = Object.assign({}, alt, { mealInstanceId: date + '-' + mealType + '-' + Date.now() });
        debouncedSave();
        renderDashboard();
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
        swapMeal(date, mealType);
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

    const pData = document.getElementById('profile-data');
    if (pData) pData.innerHTML = html;
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
    if (selectedDates.length === 0) return;
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
    let html = '<h3 style="margin-bottom:1.5rem;text-align:center;">Lista della Spesa</h3>';
    const icons = { 'Ortofrutta': '🥬', 'Carne e Pesce': '🥩', 'Latticini': '🧀', 'Dispensa': '🥫', 'Panetteria': '🍞', 'Altro': '🛒' };
    Object.keys(categories).sort().forEach(cat => {
        html += '<div style="margin-bottom:2rem;"><h4>' + (icons[cat] || '🛒') + ' ' + cat + '</h4><ul class="ingredient-list">';
        Object.values(categories[cat]).forEach((item, i) => {
            html += '<li class="ingredient-item">' + item.name + ': ' + Math.round(item.amount) + ' ' + item.unit + '</li>';
        });
        html += '</ul></div>';
    });
    document.getElementById('shopping-list-content').innerHTML = html;
}

function renderMonthlyCalendar() {
    const container = document.getElementById('monthly-calendar-container');
    if (!container) return;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();
    const todayStr = getTodayISO();

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const weekDays = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

    // Header con mese
    let html = `<div style="display:flex; justify-content:center; align-items:center; margin-bottom:2rem;">
        <h2 style="font-size: 1.5rem; color: var(--text-primary);">${monthNames[currentMonth]} ${currentYear}</h2>
    </div>`;

    // Apertura Griglia
    html += `<div class="calendar-month-grid">`;
    
    // 1. Header giorni settimana
    weekDays.forEach(wd => {
        html += `<div class="calendar-day-header">${wd}</div>`;
    });

    // 2. Calcolo offset e giorni
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0=Dom
    const startOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; // Offset per Lunedì
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 3. Slot vuoti inizio mese
    for (let i = 0; i < startOffset; i++) {
        html += `<div class="calendar-day-cell calendar-empty-slot" style="opacity: 0.1;"></div>`;
    }

    // 4. Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayPlan = appState.plan.find(p => p.date === dateStr);
        const isToday = dateStr === todayStr;
        const dayName = weekDays[new Date(currentYear, currentMonth, day).getDay() === 0 ? 6 : new Date(currentYear, currentMonth, day).getDay() - 1];

        html += `<div class="calendar-day-cell ${isToday ? 'is-today' : ''}">
            <div class="calendar-date-number">
                <span class="mobile-day-name" style="width:2.5rem; font-weight:normal; opacity:0.7;">${dayName}</span>
                ${day}
            </div>`;
        
        if (dayPlan && dayPlan.meals) {
            const m = dayPlan.meals;
            if (m.breakfast) {
                html += `<div class="calendar-meal-chip breakfast" onclick="openMealDetails('${dateStr}', 'breakfast')">
                    <span>☕</span> <span>${m.breakfast.name}</span>
                </div>`;
            }
            if (m.lunch) {
                html += `<div class="calendar-meal-chip lunch" onclick="openMealDetails('${dateStr}', 'lunch')">
                    <span>🍝</span> <span>${m.lunch.name}</span>
                </div>`;
            }
            if (m.snack) {
                html += `<div class="calendar-meal-chip snack" onclick="openMealDetails('${dateStr}', 'snack')">
                    <span>🍎</span> <span>${m.snack.name}</span>
                </div>`;
            }
            if (dayPlan.confirmed) {
                html += `<div style="font-size:0.55rem; text-align:right; color:#4ade80; margin-top:auto; font-weight:bold; letter-spacing:0.05em;">✅ CONFERMATO</div>`;
            }
        }
        
        html += `</div>`;
    }

    html += `</div>`; // Chiusura Griglia
    container.innerHTML = html;
}

// Esposizione globale per HTML onclick
window.showView = showView;
window.renderProfile = renderProfile;
window.renderDashboard = renderDashboard;
window.renderMonthlyCalendar = renderMonthlyCalendar;
window.renderShoppingSelector = renderShoppingSelector;
window.generateShoppingList = generateShoppingList;
window.openMealDetails = openMealDetails;
window.closeModal = closeModal;
window.confirmDay = confirmDay;
window.unlockDay = unlockDay;
window.swapMeal = swapMeal;
window.banRecipe = banRecipe;
window.updateProfileField = updateProfileField;
window.showInlineEdit = showInlineEdit;
window.switchAuthTab = switchAuthTab;
window.resetAppSession = resetAppSession;
