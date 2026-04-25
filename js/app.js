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

    errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Accesso in corso...';

    try {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (err) {
        errorEl.innerText = "Errore: " + err.message;
        errorEl.classList.remove('hidden');
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

    const errorEl = document.getElementById('onboarding-error');
    if (errorEl) errorEl.classList.add('hidden');
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
        if (!recipesLoaded) await fetchRecipesFromSupabase();
        
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
        }

        appState.user = profileData;
        appState.plan = plan;
        currentUser = currentUser || { id: userId };
        showView('dashboard');
        
    } catch (err) {
        if (errorEl) {
            errorEl.innerText = "Errore: " + err.message;
            errorEl.classList.remove('hidden');
        } else {
            alert("Errore: " + err.message);
        }
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
    if (viewName === 'shopping') {
        setupShoppingDaysSelector();
        renderShoppingList();
    }
    if (viewName === 'profile') renderProfile();
    if (viewName === 'admin') admin.init();

    // Toggle menu visibility
    if (['auth', 'onboarding'].includes(viewName)) {
        document.getElementById('main-nav').classList.add('hidden');
    } else {
        document.getElementById('main-nav').classList.remove('hidden');
        
        // Update active state of nav buttons
        document.querySelectorAll('.nav-links button').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`nav-${viewName}`);
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    // Close mobile menu if open
    document.getElementById('main-nav').classList.remove('mobile-active');
}

// ============================================================
// DASHBOARD
// ============================================================

function renderDashboard() {
    const container = document.getElementById('view-dashboard');
    if (!container) return;
    
    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = `
            <div class="dashboard-header">
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem;">Benvenuto! 👋</h1>
            </div>
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3 style="margin-bottom:1rem; color:var(--text-secondary);">Nessun piano alimentare generato.</h3>
                <p style="margin-bottom: 2rem;">Compila il tuo profilo per iniziare.</p>
                <button class="btn btn-primary" onclick="app.showView('onboarding')">Crea il tuo profilo</button>
            </div>
        `;
        return;
    }

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

    html += `<div class="calendar-grid">`;

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

    html += `</div>`;
    container.innerHTML = html;
}

function renderMealSlot(date, type, meal) {
    if (!meal) return '';
    const labels = { breakfast: 'Colazione', snack: 'Spuntino', lunch: 'Pranzo', dinner: 'Cena' };
    
    return `
        <div class="meal-card" onclick="openMealDetails('${date}', '${type}')">
            <div class="meal-tag">${labels[type]}</div>
            <h3 style="margin-bottom:0.5rem; font-size:1.1rem;">${meal.name}</h3>
            ${meal.portion > 1.05 ? `<span class="portion-badge">Dose x${meal.portion.toFixed(1)}</span>` : ''}
            ${meal.smartAddition ? `<div class="smart-addition-tag">+ ${meal.smartAddition.amount}${meal.smartAddition.unit} ${meal.smartAddition.name}</div>` : ''}
            <div style="display:flex; gap:1rem; margin-top:1rem; font-size:0.8rem; opacity:0.7;">
                <span>🔥 ${Math.round(meal.calories)} kcal</span>
                <span>🥩 ${Math.round(meal.macros.protein * (meal.portion || 1))}g</span>
            </div>
            <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                <button class="btn-swap btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; border-color:${meal.confirmed ? '#10b981' : ''}; color:${meal.confirmed ? '#10b981' : ''};" onclick="event.stopPropagation(); confirmMeal('${date}', '${type}')">
                    ${meal.confirmed ? '✓ Fatto' : 'Conferma'}
                </button>
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
    if (!u) return;

    container.innerHTML = `
        <form id="edit-profile-form" onsubmit="saveProfile(event)">
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
                    <label>Attività</label>
                    <select id="edit-activity" required>
                        <option value="1.2" ${u.activity_level === 1.2 ? 'selected' : ''}>Sedentario</option>
                        <option value="1.375" ${u.activity_level === 1.375 ? 'selected' : ''}>Leggero</option>
                        <option value="1.55" ${u.activity_level === 1.55 ? 'selected' : ''}>Moderato</option>
                        <option value="1.725" ${u.activity_level === 1.725 ? 'selected' : ''}>Attivo</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Obiettivo</label>
                    <select id="edit-goal">
                        <option value="lose" ${u.goal === 'lose' ? 'selected' : ''}>Perdere peso</option>
                        <option value="maintain" ${u.goal === 'maintain' ? 'selected' : ''}>Mantenimento</option>
                        <option value="gain" ${u.goal === 'gain' ? 'selected' : ''}>Aumento massa</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin-top: 1rem;">
                <label>Cibi da evitare</label>
                <textarea id="edit-dislikes" rows="1">${u.excluded_foods.join(', ')}</textarea>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 1rem; align-items: center;">
                <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Salva Modifiche</button>
                <span id="profile-save-feedback" style="color: #10b981; font-weight: bold; opacity: 0; transition: opacity 0.3s;">Salvato!</span>
            </div>
        </form>
    `;
}

function saveProfile(e) {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('edit-weight').value);
    const height = parseInt(document.getElementById('edit-height').value);
    const activity = parseFloat(document.getElementById('edit-activity').value);
    const goal = document.getElementById('edit-goal').value;
    const dislikes = document.getElementById('edit-dislikes').value.split(',').map(s => s.trim().toLowerCase()).filter(s => s);

    appState.user.weight = weight;
    appState.user.height = height;
    appState.user.activity_level = activity;
    appState.user.goal = goal;
    appState.user.excluded_foods = dislikes;

    // Recalculate target calories using calculateBMI logic
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    let category = '';
    if (bmi < 18.5) category = 'Sottopeso';
    else if (bmi < 25) category = 'Normopeso';
    else if (bmi < 30) category = 'Sovrappeso';
    else category = 'Obesità';

    let bmr = 0;
    if (appState.user.gender === 'male') {
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * appState.user.age);
    } else {
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * appState.user.age);
    }

    let tdee = bmr * activity;
    let targetCals = tdee;
    if (goal === 'lose') targetCals -= 500;
    if (goal === 'gain') targetCals += 300;
    
    appState.user.bmi = bmi.toFixed(1);
    appState.user.bmiCategory = category;
    appState.user.targetCalories = Math.round(targetCals);

    debouncedSave();
    
    const feedback = document.getElementById('profile-save-feedback');
    feedback.style.opacity = '1';
    setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
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
    
    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = `
            <div class="dashboard-header">
                <h2 style="font-size:2rem;">🗓️ Calendario Settimanale</h2>
            </div>
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3 style="color:var(--text-secondary);">Nessun piano alimentare generato.</h3>
            </div>
        `;
        return;
    }
    
    const today = getTodayISO();
    // Use the entire plan for the month calendar (30 days)
    const visiblePlan = appState.plan.filter(p => p.date >= today).slice(0, 30);

    let html = `
        <div class="dashboard-header">
            <h2 style="font-size:2rem;">🗓️ Calendario Mensile</h2>
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
    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = `
            <div class="glass-panel text-center" style="padding: 3rem;">
                <h3 style="color:var(--text-secondary);">Nessun piano alimentare generato.</h3>
            </div>
        `;
        return;
    }
    
    if (!forceGenerate) {
        container.innerHTML = '<p class="text-center text-muted">Seleziona i giorni in alto e clicca "Genera Lista Selezionata" per vedere gli ingredienti da comprare.</p>';
        return;
    }

    const today = getTodayISO();
    let plan = appState.plan.filter(p => p.date >= today).slice(0, 7);
    
    const checkboxes = document.querySelectorAll('.shopping-day-cb');
    if (checkboxes.length > 0) {
        const selectedDates = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (selectedDates.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Seleziona almeno un giorno.</p>';
            return;
        }
        plan = plan.filter(day => selectedDates.includes(day.date));
    }
    
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

    // ----- Categorize ingredients -----
    const CATEGORIES = {
        '🥩 Carne & Pesce':   ['pollo','manzo','salmone','tonno','merluzzo','tacchino','maiale','prosciutto','bresaola','speck','sgombro','Zenzero','gamberi','cozze','vongole','pesce','carne','filetto','bistecca','cotoletta','hamburger','wurstel'],
        '🥛 Latticini & Uova': ['latte','panna','yogurt','burro','mozzarella','parmigiano','pecorino','ricotta','uova','uovo','formaggio','grana','emmental','stracchino','mascarpone','gorgonzola'],
        '🍞 Pane & Cereali':   ['pane','pasta','riso','farro','orzo','avena','farina','semola','crackers','grissini','pancarré','pangrattato','polenta','lasagne','gnocchi','couscous','quinoa'],
        '🫒 Condimenti & Grassi': ['olio','aceto','sale','pepe','zucchero','miele','salsa','maionese','ketchup','senape','dado','brodo','pesto','tahini','soia'],
        '🌿 Spezie & Aromi':   ['aglio','cipolla','prezzemolo','basilico','rosmarino','origano','timo','menta','zenzero','curcuma','paprika','cannella','peperoncino','curry','alloro','salvia','erba'],
        '🥫 Conserve & Scatolame': ['pomodori','passata','pelati','legumi','fagioli','ceci','lenticchie','mais','tonno in scatola','sardine','acciughe','olive','capperi','funghi secchi'],
        '🫙 Frutta Secca & Semi': ['noci','mandorle','nocciole','pistacchi','anacardi','pinoli','semi di','sesamo','lino','girasole','chia','cocco'],
        '🍎 Frutta':           ['mele','banane','arance','limone','lime','fragole','mirtilli','lamponi','pesche','pere','uva','kiwi','melone','anguria','ananas','avocado','mango'],
        '🥦 Verdure':          ['spinaci','zucchine','carote','broccoli','cavolfiore','cavolo','melanzane','peperoni','pomodori freschi','lattuga','insalata','sedano','finocchio','asparagi','piselli','carciofi','radicchio','bietole','patate','cipollotti'],
    };

    function getCategory(name) {
        const lower = name.toLowerCase();
        for (const [cat, keywords] of Object.entries(CATEGORIES)) {
            if (keywords.some(k => lower.includes(k))) return cat;
        }
        return '🛒 Altro';
    }

    // Group by category
    const grouped = {};
    Object.values(items).sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
        const cat = getCategory(item.name);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
    });

    // Sort categories by predefined order
    const catOrder = Object.keys(CATEGORIES).concat(['🛒 Altro']);
    const sortedCats = catOrder.filter(c => grouped[c]);

    let html = sortedCats.map(cat => `
        <div style="margin-bottom: 2rem;">
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 0.75rem; letter-spacing: 0.05em;">${cat}</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.6rem;">
                ${grouped[cat].map(item => `
                    <label style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border); border-radius: 10px; padding: 0.65rem 0.9rem; cursor: pointer; transition: background 0.2s;">
                        <span style="display: flex; align-items: center; gap: 0.5rem; min-width: 0;">
                            <input type="checkbox" class="ingredient-checkbox" style="flex-shrink: 0;">
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.9rem;" title="${item.name}">${item.name}</span>
                        </span>
                        <span style="font-weight: 700; color: var(--accent-primary); white-space: nowrap; font-size: 0.9rem; flex-shrink: 0;">${Math.round(item.amount)} ${item.unit}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

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

    // Safety timeout: hide loader after 10s even if something hangs
    setTimeout(hideLoader, 10000);

    document.getElementById('btn-close-modal').onclick = closeModal;
    document.getElementById('meal-modal').onclick = (e) => {
        if (e.target === document.getElementById('meal-modal')) closeModal();
    };

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
