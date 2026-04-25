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
    console.log("NutriPlan: switching auth tab to", type);
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

    loadingEl.style.display = 'block';
    submitBtn.disabled = true;
    errorEl.style.display = 'none';

    try {
        let result;
        if (isLogin) {
            result = await _supabase.auth.signInWithPassword({ email, password });
        } else {
            result = await _supabase.auth.signUp({ email, password });
            if (!result.error && result.data.user && !result.data.session) {
                loadingEl.style.display = 'none';
                submitBtn.disabled = false;
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
        loadingEl.style.display = 'none';
        submitBtn.disabled = false;
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
    console.log("NutriPlan: Salvataggio in corso...");
    
    try {
        const { error } = await _supabase
            .from('user_data')
            .upsert({
                id: currentUser.id,
                nutrition_profile: appState.user,
                meal_plan: appState.plan,
                updated_at: new Date()
            });

        if (error) throw error;
        console.log("NutriPlan: Dati salvati con successo.");
    } catch (err) {
        console.error("NutriPlan: Errore nel salvataggio Cloud:", err);
    }
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
                if (newDay.meals[t]) newDay.meals[t].mealInstanceId = `${dateStr}-${t}`;
            });
            appState.plan.push(newDay);
            added++;
        }
    }
    if (added > 0) debouncedSave();
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("NutriPlan: App Inizializzata (DOM Ready)");
    
    initDomRefs();

    // Fallback di sicurezza: rimuove SEMPRE il loader globale dopo 4 secondi.
    // Previene il blocco su "Sincronizzazione in corso..." se F5 causa un hang di Supabase.
    if (localStorage.getItem('supabase.auth.token') && !sessionStorage.getItem('nutriplan_init_check')) {
        console.log("NutriPlan: Eseguo controllo integrità sessione...");
        sessionStorage.setItem('nutriplan_init_check', 'true');
    }

    // Fallback di sicurezza: rimuove SEMPRE il loader globale dopo 4 secondi.
    // Previene il blocco su "Sincronizzazione in corso..." se F5 causa un hang di Supabase.
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader && loader.style.display !== 'none') {
            console.warn("NutriPlan: Timeout globale di sicurezza raggiunto. Nascondo loader.");
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
    }, 4000);

    async function handleAuthChange(event, session) {
        console.log("NutriPlan: Auth Event ->", event, "Session present:", !!session);
        
        try {
            if (session && session.user) {
                console.log("NutriPlan: Sessione attiva per", session.user.email);
                currentUser = session.user;
                
                // 1. Carica le ricette se non ancora presenti
                if (!recipesLoaded) {
                    const success = await fetchRecipesFromSupabase();
                    if (!success) {
                        console.error("NutriPlan: CRITICAL - Failed to load recipes.");
                        showAuthError("Impossibile caricare il database delle ricette. Riprova più tardi.");
                        // Non usciamo, proviamo comunque a caricare i dati utente
                    }
                }

                // 2. Assicura che i listener siano pronti
                setupEventListeners();
                
                const hasData = await loadFromCloud();
                
                if (hasData) {
                    console.log("NutriPlan: Dati trovati, mostro Dashboard.");
                    showView('dashboard');
                } else {
                    console.log("NutriPlan: Dati non trovati, mostro Onboarding.");
                    showView('onboarding');
                }
            } else {
                console.log("NutriPlan: Nessuna sessione o logout, mostro Auth.");
                currentUser = null;
                appState = { user: null, plan: [] };
                setupEventListeners();
                showView('auth');
            }
        } catch (error) {
            console.error("NutriPlan: Errore critico in handleAuthChange:", error);
            const errorEl = document.getElementById('auth-error');
            if (errorEl) {
                errorEl.textContent = "Errore durante il caricamento dei dati: " + (error.message || "Errore sconosciuto.");
                errorEl.style.display = 'block';
            }
            showView('auth');
        } finally {
            // Rimuove loader globale
            const loader = document.getElementById('global-loader');
            if (loader) {
                console.log("NutriPlan: Nascondo loader.");
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }
    }

    // 1. Recupera la sessione iniziale proattivamente (risolve il blocco F5)
    _supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuthChange('INITIAL_SESSION_MANUAL', session);
    });

    // 2. Ascolta i cambiamenti successivi
    _supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') return; // Gestita manualmente sopra
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
    // Guard: don't add listeners twice
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
    console.log("NutriPlan: Navigating to view ->", viewName);
    // Chiudi il menu mobile se aperto
    toggleMobileMenu(true);

    const allViews = ['view-auth','view-onboarding','view-dashboard','view-shopping','view-profile','view-calendar'];
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) { 
            el.classList.remove('active'); 
            el.classList.add('hidden'); 
        }
    });

    const navItems = {
        'dashboard': { btn: navDashboard, view: 'view-dashboard' },
        'shopping':  { btn: navShopping,  view: 'view-shopping' },
        'calendar':  { btn: document.getElementById('nav-calendar'), view: 'view-calendar' },
        'profile':   { btn: document.getElementById('nav-profile'),  view: 'view-profile' },
        'auth':       { btn: null, view: 'view-auth' },
        'onboarding': { btn: null, view: 'view-onboarding' }
    };

    // Reset nav active states
    Object.values(navItems).forEach(item => {
        if (item.btn) item.btn.classList.remove('active');
    });

    try {
        const config = navItems[viewName];
        if (config) {
            const v = document.getElementById(config.view);
            if (v) {
                v.classList.remove('hidden');
                v.classList.add('active');
            }
            if (config.btn) config.btn.classList.add('active');
            
            // Gestione mainNav
            if (viewName === 'auth' || viewName === 'onboarding') {
                if (mainNav) mainNav.classList.add('hidden');
            } else {
                if (mainNav) mainNav.classList.remove('hidden');
            }

            // Rendering specifici
            if (viewName === 'dashboard') renderDashboard();
            if (viewName === 'shopping') renderShoppingSelector();
            if (viewName === 'calendar') renderMonthlyCalendar();
            if (viewName === 'profile') renderProfile();
        } else {
            console.warn("NutriPlan: Unknown view ->", viewName);
        }
    } catch (err) {
        console.error("NutriPlan: Error in showView:", err);
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
        ensurePlanCoversWindow(); // Assicura che oggi sia coperto

        document.getElementById('caloric-info').innerHTML =
            'Fabbisogno calcolato: <span class="highlight">' + appState.user.targetCalories + ' kcal</span>/giorno';

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
            if (dayPlan.meals.breakfast && !dayPlan.meals.breakfast.excluded) totalCals += dayPlan.meals.breakfast.calories;
            if (dayPlan.meals.lunch && !dayPlan.meals.lunch.excluded)     totalCals += dayPlan.meals.lunch.calories;
            if (dayPlan.meals.snack && !dayPlan.meals.snack.excluded) totalCals += dayPlan.meals.snack.calories;

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

        // Event listeners for buttons in cards
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
                <span class="value">${meal.macros?.protein || 0}g</span>
            </div>
            <div class="meta-item">
                <span class="label">Carboidrati</span>
                <span class="value">${meal.macros?.carbs || 0}g</span>
            </div>
        </div>

        <h3 style="margin-bottom:1rem;">Ingredienti</h3>
        <ul class="ingredient-list">`;
    
    meal.ingredients.forEach(ing => {
        html += `<li class="ingredient-item">
            <span>${ing.name}</span>
            <span style="color:var(--accent-primary); font-weight:600;">${Math.round(ing.amount)} ${ing.unit}</span>
        </li>`;
    });

    html += `</ul>
        <h3 style="margin-bottom:1rem;">Istruzioni</h3>`;
    
    meal.instructions.forEach((step, i) => {
        html += `<div class="instruction-step">
            <div class="step-number">${i+1}</div>
            <p>${step}</p>
        </div>`;
    });

    if (meal.sourceUrl) {
        html += `<div class="recipe-source-container">
            <a href="${meal.sourceUrl}" target="_blank" class="recipe-source-btn">
                <span>📖 Leggi su Fonte Originale</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>
            </a>
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
// PROFILE & SETTINGS
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

    row.innerHTML = inputHtml + '<button class="btn-small" onclick="updateProfileField(\'' + field + '\', document.getElementById(\'inline-edit-' + field + '\').value)">OK</button>';
}

function updateProfileField(field, newValue) {
    if (field !== 'dislikes') {
        appState.user[field] = (field === 'goal' || field === 'activity') ? newValue : parseFloat(newValue);
        
        // Ricalcola target
        const bmr            = calculateBMR(appState.user.weight, appState.user.height, appState.user.age, appState.user.gender);
        const tdee           = calculateTDEE(bmr, appState.user.activity);
        appState.user.targetCalories = calculateTargetCalories(tdee, appState.user.goal);
    } else {
        appState.user.dislikes = newValue;
    }

    debouncedSave();
    renderProfile();
}

function profileCard(label, value, highlight = false) {
    return '<div class="profile-edit-card" style="text-align:center;">'
        + '<div class="label">' + label + '</div>'
        + '<div class="value" style="' + (highlight ? 'color:var(--accent-primary);font-size:1.2rem;' : '') + '">' + value + '</div>'
        + '</div>';
}

// ============================================================
// MEAL OPERATIONS
// ============================================================

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

function swapMeal(date, mealType) {
    const idx = appState.plan.findIndex(p => p.date === date);
    if (idx !== -1) {
        const currentMeal = appState.plan[idx].meals[mealType];
        const newMeal = findAlternativeMeal(currentMeal, appState.user.dislikes, appState.user.targetCalories, appState.user.bannedRecipeIds, sessionSkippedIds);
        
        if (newMeal) {
            newMeal.mealInstanceId = `${date}-${mealType}`;
            appState.plan[idx].meals[mealType] = newMeal;
            sessionSkippedIds.push(currentMeal.id);
            debouncedSave();
            renderDashboard();
        } else {
            alert("Nessuna alternativa trovata con le tue preferenze.");
        }
    }
}

function banRecipe(date, mealType) {
    const idx = appState.plan.findIndex(p => p.date === date);
    if (idx !== -1) {
        const mealId = appState.plan[idx].meals[mealType].id;
        if (confirm("Non ti proporremo più questa ricetta in futuro. Continuare?")) {
            if (!appState.user.bannedRecipeIds) appState.user.bannedRecipeIds = [];
            appState.user.bannedRecipeIds.push(mealId);
            swapMeal(date, mealType); // Sostituisci subito quella attuale
        }
    }
}

// ============================================================
// SHOPPING LIST
// ============================================================

function renderShoppingSelector() {
    const container = document.getElementById('shopping-days-selector');
    if (!container) return;
    container.innerHTML = '';
    
    const today = getTodayISO();
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    visiblePlan.forEach(p => {
        const dateObj = new Date(p.date + 'T00:00:00');
        const labelText = dateObj.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        
        const label = document.createElement('label');
        label.style = 'display:flex; align-items:center; gap:0.5rem; background:rgba(255,255,255,0.05); padding:0.5rem 1rem; border-radius:20px; cursor:pointer;';
        label.innerHTML = `<input type="checkbox" class="day-checkbox" value="${p.date}" checked> ${labelText}`;
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
        const dObj = new Date(currentYear, currentMonth, day);
        const dayIdx = dObj.getDay() === 0 ? 6 : dObj.getDay() - 1;
        const dayName = weekDays[dayIdx];

        html += `<div class="calendar-day-cell ${isToday ? 'is-today' : ''}">
            <div class="calendar-date-number">
                <span class="mobile-day-header" style="display:none; font-size:0.6rem; opacity:0.6; margin-right:4px;">${dayName}</span>
                ${day}
            </div>`;
        
        if (dayPlan && dayPlan.meals) {
            const m = dayPlan.meals;
            // Mostriamo solo icone se lo spazio è pochissimo (gestito via CSS), 
            // ma qui iniettiamo il testo completo per accessibilità
            if (m.breakfast) {
                html += `<div class="calendar-meal-chip breakfast" onclick="openMealDetails('${dateStr}', 'breakfast')" title="${m.breakfast.name}">
                    <span class="meal-icon">☕</span> <span class="meal-text">${m.breakfast.name}</span>
                </div>`;
            }
            if (m.lunch) {
                html += `<div class="calendar-meal-chip lunch" onclick="openMealDetails('${dateStr}', 'lunch')" title="${m.lunch.name}">
                    <span class="meal-icon">🍝</span> <span class="meal-text">${m.lunch.name}</span>
                </div>`;
            }
            if (m.snack) {
                html += `<div class="calendar-meal-chip snack" onclick="openMealDetails('${dateStr}', 'snack')" title="${m.snack.name}">
                    <span class="meal-icon">🍎</span> <span class="meal-text">${m.snack.name}</span>
                </div>`;
            }
            if (dayPlan.confirmed) {
                html += `<div class="confirmed-indicator">✅</div>`;
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
