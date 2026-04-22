// --- APP STATE ---
let appState = { user: null, plan: [] };
let currentUser = null; // Supabase auth user
let saveTimeout = null;

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
    appState.plan = data.meal_plan || [];

    // Ensure 'excluded' flag exists on all meals
    appState.plan.forEach(day => {
        ['breakfast', 'snack', 'lunch'].forEach(t => {
            if (day.meals[t] && day.meals[t].excluded === undefined) {
                day.meals[t].excluded = false;
            }
        });
    });
    return true;
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Listen to auth state changes (login, logout, page load)
    _supabase.auth.onAuthStateChange(async (event, session) => {
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
});

function setupEventListeners() {
    // Guard: don't add listeners twice
    if (document._listenersSetup) return;
    document._listenersSetup = true;

    navDashboard.addEventListener('click', () => showView('dashboard'));
    navShopping.addEventListener('click',  () => showView('shopping'));
    document.getElementById('nav-profile').addEventListener('click', () => showView('profile'));

    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

    document.getElementById('btn-logout').addEventListener('click', async () => {
        await _supabase.auth.signOut();
        // onAuthStateChange will fire and redirect to auth view
    });

    document.querySelector('.close-modal').addEventListener('click', closeModal);
    document.querySelector('.close-qr-modal').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.add('hidden');
    });

    document.getElementById('btn-share').addEventListener('click', generateShareLink);
    document.getElementById('generate-shopping').addEventListener('click', generateShoppingList);

    document.getElementById('btn-regenerate').addEventListener('click', () => {
        if (confirm('Vuoi rigenerare il piano settimanale? Il piano attuale verrà sostituito.')) {
            appState.plan = generateMonthlyPlan(appState.user.targetCalories, appState.user.dislikes);
            appState.plan.forEach(day => {
                if (day.meals.breakfast) day.meals.breakfast.excluded = false;
                if (day.meals.snack)     day.meals.snack.excluded = false;
                if (day.meals.lunch)     day.meals.lunch.excluded = false;
            });
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
    const allViews = ['view-auth','view-onboarding','view-dashboard','view-shopping','view-profile'];
    allViews.forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('active'); el.classList.add('hidden'); }
    });

    const allNavBtns = [navDashboard, navShopping, document.getElementById('nav-profile')];
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

    appState.user = { age, gender, weight, height, activity, goal, dislikes, targetCalories };
    appState.plan = generateMonthlyPlan(targetCalories, dislikes);

    appState.plan.forEach(day => {
        if (day.meals.breakfast) day.meals.breakfast.excluded = false;
        if (day.meals.snack)     day.meals.snack.excluded = false;
        if (day.meals.lunch)     day.meals.lunch.excluded = false;
    });

    debouncedSave();
    showView('dashboard');
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('onboarding-form');
    if (form) form.addEventListener('submit', handleOnboardingSubmit);
});

// ============================================================
// DASHBOARD RENDERING
// ============================================================

function renderDashboard() {
    if (!appState.user) return;
    document.getElementById('caloric-info').innerHTML =
        'Fabbisogno calcolato: <span class="highlight">' + appState.user.targetCalories + ' kcal</span>/giorno';

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    appState.plan.forEach(dayPlan => {
        let totalCals = 0;
        if (!dayPlan.meals.breakfast.excluded) totalCals += dayPlan.meals.breakfast.calories;
        if (!dayPlan.meals.lunch.excluded)     totalCals += dayPlan.meals.lunch.calories;
        if (dayPlan.meals.snack && !dayPlan.meals.snack.excluded) totalCals += dayPlan.meals.snack.calories;

        const card = document.createElement('div');
        card.className = 'day-card';

        let mealsHtml = renderMealSlot(dayPlan.day, 'breakfast', dayPlan.meals.breakfast);
        if (dayPlan.meals.snack) mealsHtml += renderMealSlot(dayPlan.day, 'snack', dayPlan.meals.snack);
        mealsHtml += renderMealSlot(dayPlan.day, 'lunch', dayPlan.meals.lunch);

        card.innerHTML = '<div class="day-header"><h3>Giorno ' + dayPlan.day + '</h3>'
            + '<span class="day-kcal">' + totalCals + ' kcal <span style="font-size:0.7em;font-weight:normal;">effettive</span></span></div>'
            + mealsHtml;
        grid.appendChild(card);
    });

    document.querySelectorAll('.btn-view-meal').forEach(btn => {
        btn.addEventListener('click', e => {
            openMealDetails(parseInt(e.target.dataset.day), e.target.dataset.type);
        });
    });

    document.querySelectorAll('.btn-swap').forEach(btn => {
        btn.addEventListener('click', e => {
            swapMeal(parseInt(e.target.dataset.day), e.target.dataset.type);
        });
    });

    document.querySelectorAll('.exclude-checkbox').forEach(cb => {
        cb.addEventListener('change', e => {
            const day  = parseInt(e.target.dataset.day);
            const type = e.target.dataset.type;
            const idx  = appState.plan.findIndex(p => p.day === day);
            appState.plan[idx].meals[type].excluded = !e.target.checked;
            debouncedSave();
            renderDashboard();
        });
    });
}

function renderMealSlot(dayIndex, mealType, meal) {
    const labels = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino' };
    const excludedClass  = meal.excluded ? 'excluded' : '';
    const checkedAttr    = meal.excluded ? '' : 'checked';
    return '<div class="meal-slot ' + excludedClass + '">'
        + '<div class="meal-type"><span>' + labels[mealType] + '</span><span>' + meal.calories + ' kcal</span></div>'
        + '<div class="meal-name">' + meal.name + '</div>'
        + '<div class="meal-macros"><span>P: ' + meal.macros.protein + 'g</span><span>C: ' + meal.macros.carbs + 'g</span><span>G: ' + meal.macros.fat + 'g</span></div>'
        + '<div class="meal-toggle"><input type="checkbox" class="exclude-checkbox" data-day="' + dayIndex + '" data-type="' + mealType + '" ' + checkedAttr + '><label>Includi Pasto</label></div>'
        + '<div class="meal-actions"><button class="btn-small btn-view-meal" data-day="' + dayIndex + '" data-type="' + mealType + '">Ricetta</button>'
        + '<button class="btn-small btn-swap" data-day="' + dayIndex + '" data-type="' + mealType + '">Cambia</button></div>'
        + '</div>';
}

// ============================================================
// MEAL DETAIL MODAL
// ============================================================

function openMealDetails(dayIndex, mealType) {
    const dayPlan = appState.plan.find(p => p.day === dayIndex);
    const meal    = dayPlan.meals[mealType];
    const labels  = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino' };

    let html = '<div class="meal-type">Dieta Mediterranea - ' + labels[mealType] + ' - Giorno ' + dayIndex + '</div>'
        + '<h2>' + meal.name + '</h2>';

    if (meal.imageUrl) {
        html += '<div style="margin:1rem 0;border-radius:12px;overflow:hidden;height:200px;">'
            + '<img src="' + meal.imageUrl + '" alt="' + meal.name + '" style="width:100%;height:100%;object-fit:cover;"></div>';
    }

    html += '<div class="meal-macros" style="margin-bottom:1.5rem;font-size:0.9rem;">'
        + '<span><strong>' + meal.calories + ' kcal</strong></span>'
        + '<span>P: ' + meal.macros.protein + 'g</span>'
        + '<span>C: ' + meal.macros.carbs + 'g</span>'
        + '<span>G: ' + meal.macros.fat + 'g</span></div>'
        + '<div class="recipe-prep"><h4>Ingredienti</h4><ul>'
        + meal.ingredients.map(i => '<li>' + i.amount + i.unit + ' ' + i.name + '</li>').join('')
        + '</ul></div>'
        + '<div class="recipe-prep"><h4>Preparazione</h4><ol>'
        + meal.instructions.map(s => '<li>' + s + '</li>').join('')
        + '</ol></div>';

    if (meal.sourceUrl) {
        html += '<div style="margin-top:2rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.1);">'
            + '<a href="' + meal.sourceUrl + '" target="_blank" style="color:var(--accent-primary);text-decoration:none;font-weight:600;">🔗 Vai alla Ricetta Originale</a></div>';
    }

    document.getElementById('meal-details').innerHTML = html;
    document.getElementById('meal-modal').classList.remove('hidden');
}

function closeModal() { document.getElementById('meal-modal').classList.add('hidden'); }

// ============================================================
// SWAP MEAL
// ============================================================

function swapMeal(dayIndex, mealType) {
    const idx     = appState.plan.findIndex(p => p.day === dayIndex);
    const current = appState.plan[idx].meals[mealType];
    const alt     = findAlternativeMeal(current, appState.user.dislikes, current.calories);
    if (alt) {
        alt.excluded = false;
        appState.plan[idx].meals[mealType] = Object.assign({}, alt, { mealInstanceId: 'd' + dayIndex + '-' + mealType + '-' + Date.now() });
        debouncedSave();
        renderDashboard();
    } else {
        alert('Nessuna alternativa trovata nel database.');
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

    document.getElementById('profile-data').innerHTML = '<p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem;">Account: <strong style="color:var(--accent-primary);">' + userEmail + '</strong></p>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">'
        + profileCard('ETÀ', u.age + ' anni')
        + profileCard('CORPO', u.weight + ' kg · ' + u.height + ' cm')
        + profileCard('BMI', bmiData.bmi + ' <span style="font-size:0.8rem;color:var(--text-muted);">(' + bmiData.category + ')</span>', true)
        + profileCard('TARGET CALORICO', u.targetCalories + ' kcal/giorno', true)
        + profileCard('ATTIVITÀ', actLabels[u.activity] || u.activity)
        + profileCard('OBIETTIVO', goalLabels[u.goal] || u.goal)
        + '</div>'
        + (u.dislikes && u.dislikes.trim() ? '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:1rem;">'
            + '<div style="font-size:0.75rem;color:#f87171;margin-bottom:0.5rem;font-weight:600;">🚫 CIBI ESCLUSI</div>'
            + '<div style="color:var(--text-secondary);">' + u.dislikes + '</div></div>' : '');
}

function profileCard(label, value, accent) {
    return '<div style="background:rgba(0,0,0,0.2);border-radius:12px;padding:1rem;border:1px solid rgba(255,255,255,0.05);">'
        + '<div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.25rem;">' + label + '</div>'
        + '<div style="font-size:1.1rem;font-weight:700;' + (accent ? 'color:var(--accent-primary);' : '') + '">' + value + '</div>'
        + '</div>';
}

// ============================================================
// SHOPPING LIST
// ============================================================

function generateShoppingList() {
    const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => parseInt(cb.value));
    if (selectedDays.length === 0) {
        document.getElementById('shopping-list-content').innerHTML = '<p class="text-center text-muted">Seleziona almeno un giorno.</p>';
        return;
    }

    const daysToShop = appState.plan.filter(p => selectedDays.includes(p.day));
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
    let html = '<h3 style="margin-bottom:1.5rem;text-align:center;">Spesa per i Giorni: ' + selectedDays.join(', ') + '</h3>';
    html += '<p class="text-center text-muted" style="margin-bottom:2rem;font-size:0.9rem;">Spunta gli ingredienti che hai già in dispensa.</p>';

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
// QR CODE / SHARE
// ============================================================

function generateShareLink() {
    const compressedPlan = appState.plan.map(day => {
        const d = { day: day.day, b: day.meals.breakfast.id, l: day.meals.lunch.id };
        if (day.meals.snack) d.s = day.meals.snack.id;
        return d;
    });
    const base64Str = btoa(JSON.stringify({ user: appState.user, planIds: compressedPlan }));
    const shareUrl  = window.location.href.split('?')[0] + '?p=' + base64Str;

    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: shareUrl, width: 200, height: 200,
        colorDark: '#0f172a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L
    });
    document.getElementById('share-link-text').textContent = shareUrl;
    document.getElementById('qr-modal').classList.remove('hidden');
}

function hydratePlanFromIds(planIds) {
    return planIds.map(day => {
        const breakfast = recipesDB.find(r => r.id === day.b);
        const lunch     = recipesDB.find(r => r.id === day.l);
        const meals = {
            breakfast: Object.assign({}, breakfast, { mealInstanceId: 'd' + day.day + '-b', excluded: false }),
            lunch:     Object.assign({}, lunch,     { mealInstanceId: 'd' + day.day + '-l', excluded: false })
        };
        if (day.s) {
            const snack = snacksDB.find(r => r.id === day.s);
            meals.snack = Object.assign({}, snack, { mealInstanceId: 'd' + day.day + '-s', excluded: false });
        }
        return { day: day.day, meals };
    });
}
