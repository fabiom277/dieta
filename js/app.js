// --- APP STATE ---
let appState = { user: null, plan: [] };
let currentUser = null; 
let saveTimeout = null;
let sessionSkippedIds = []; 
let recipesLoaded = false;

console.log("NutriPlan: Script loading...");

// --- UTILS ---
function hideLoader() {
    console.log("NutriPlan: Hiding loader...");
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
        activity_level: parseFloat(document.getElementById('activity').value),
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

        // 1. Handle Auth
        if (!userId) {
            const { data: authData, error: authError } = await _supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { first_setup: true } }
            });

            if (authError) {
                // If user already exists, try to log in instead
                if (authError.message.toLowerCase().includes('already registered') || authError.status === 400) {
                    const { data: signInData, error: signInError } = await _supabase.auth.signInWithPassword({ email, password });
                    if (signInError) throw new Error("Utente già registrato con questa email. Prova ad accedere o usa un'altra email.");
                    userId = signInData.user.id;
                } else {
                    throw authError;
                }
            } else if (!authData.user) {
                throw new Error("Impossibile creare l'account.");
            } else {
                userId = authData.user.id;
            }
        }

        // 2. Prepare Data
        if (!recipesLoaded) await fetchRecipesFromSupabase();
        
        const bmr = calculateBMR(profileData.weight, profileData.height, profileData.age, profileData.gender);
        const tdee = calculateTDEE(bmr, profileData.activity_level);
        profileData.targetCalories = calculateTargetCalories(tdee, profileData.goal);
        
        const bmiInfo = calculateBMI(profileData.weight, profileData.height);
        profileData.bmi = bmiInfo.bmi;
        profileData.bmiCategory = bmiInfo.category;
        
        const plan = generateMonthlyPlan(profileData);

        // 3. Save to user_data
        const { error: dbError } = await _supabase.from('user_data').upsert({
            id: userId,
            nutrition_profile: profileData,
            meal_plan: plan,
            updated_at: new Date().toISOString()
        });

        if (dbError) throw dbError;

        appState.user = profileData;
        appState.plan = plan;
        currentUser = currentUser || { id: userId };
        
        // Final verification of recipes
        if (!appState.plan || appState.plan.length === 0 || !appState.plan[0].meals.lunch) {
             console.warn("Piano generato vuoto, riprovando...");
             appState.plan = generateMonthlyPlan(profileData);
             await saveToCloud();
        }

        showView('dashboard');
        
    } catch (err) {
        console.error("Onboarding error:", err);
        if (errorEl) {
            let msg = err.message || "Qualcosa è andato storto.";
            if (msg.toLowerCase().includes('already registered')) {
                msg = "Questa email è già registrata. <a href='#' onclick='app.showView(\"auth\")' style='color:var(--accent-primary); font-weight:700;'>Clicca qui per accedere</a>.";
            }
            errorEl.innerHTML = "Errore: " + msg;
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
    console.log("NutriPlan: Fetching recipes...");
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
        console.log(`NutriPlan: Loaded ${recipesDB.length} recipes and ${snacksDB.length} snacks.`);
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
    console.log("NutriPlan: Loading user data from cloud...");
    if (!currentUser) return false;
    const { data, error } = await _supabase.from('user_data').select('*').eq('id', currentUser.id).single();
    if (error || !data) {
        console.log("NutriPlan: No cloud data found or error:", error);
        return false;
    }
    appState.user = data.nutrition_profile;
    appState.plan = data.meal_plan || [];
    console.log("NutriPlan: User data loaded.");
    return true;
}

// ============================================================
// NAVIGATION & VIEWS
// ============================================================

function showView(viewName) {
    console.log("NutriPlan: Showing view:", viewName);
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

    // Toggle menu visibility
    const nav = document.getElementById('main-nav');
    if (nav) {
        if (['auth', 'onboarding'].includes(viewName)) {
            nav.classList.add('hidden');
        } else {
            nav.classList.remove('hidden');
            
            // Update active state of nav buttons
            document.querySelectorAll('.nav-links button').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.getElementById(`nav-${viewName}`);
            if (activeBtn) activeBtn.classList.add('active');
        }
        // Close mobile menu if open
        nav.classList.remove('mobile-active');
    }
}

// ============================================================
// DASHBOARD
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
    // Inizia dal lunedì della settimana corrente o semplicemente mostra i prossimi 7 giorni
    // Per ora manteniamo i prossimi 7 giorni per semplicità, ma con un design migliore
    const weekPlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    let html = `<div class="weekly-grid">`;

    weekPlan.forEach((day, index) => {
        const dateObj = new Date(day.date + 'T00:00:00');
        const dayName = dateObj.toLocaleDateString('it-IT', { weekday: 'long' });
        const dayNum  = dateObj.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
        const isToday = day.date === today;

        // Calcola calorie consumate vs target
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
                ${(meal.instructions && Array.isArray(meal.instructions)) 
                    ? meal.instructions.map(s => `<li style="margin-bottom:0.8rem;">${s}</li>`).join('') 
                    : '<li style="color:var(--text-muted);">Passaggi non disponibili per questa ricetta.</li>'}
            </ol>
            
            ${(meal.instructions && meal.instructions.length > 0) ? `
                <button class="btn btn-primary" style="width: 100%; margin-top: 1.5rem; padding: 1rem; font-size: 1rem;" onclick="startCookingSession('${date}', '${mealType}')">
                    👨‍🍳 Inizia Guida Passo-Passo
                </button>
            ` : ''}

            ${meal.sourceUrl ? `<p style="margin-top:1.5rem; font-size:0.85rem;"><a href="${meal.sourceUrl}" target="_blank" style="color:var(--accent-primary); text-decoration:none;">📖 Vedi ricetta originale su ${new URL(meal.sourceUrl).hostname}</a></p>` : ''}
        </div>
    </div>`;

    document.getElementById('meal-details').innerHTML = html;
    document.getElementById('meal-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function startCookingSession(date, type) {
    const dayPlan = appState.plan.find(p => p.date === date);
    const meal = dayPlan.meals[type];
    if (!meal || !meal.instructions || meal.instructions.length === 0) return;

    let currentStep = 0;
    const totalSteps = meal.instructions.length;

    const modal = document.getElementById('meal-modal');
    const content = document.getElementById('meal-details');

    const updateView = () => {
        const progress = ((currentStep + 1) / totalSteps) * 100;
        content.innerHTML = `
            <div style="padding: 2rem; display: flex; flex-direction: column; min-height: 400px; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-primary); text-transform: uppercase;">Step ${currentStep + 1} di ${totalSteps}</span>
                        <div style="width: 60%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${progress}%; height: 100%; background: var(--accent-primary); transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    
                    <h2 style="font-size: 1.5rem; line-height: 1.4; margin-bottom: 2rem;">${meal.instructions[currentStep]}</h2>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn btn-outline" style="flex: 1;" ${currentStep === 0 ? 'disabled' : ''} id="cooking-prev">⬅️ Indietro</button>
                    ${currentStep < totalSteps - 1 
                        ? `<button class="btn btn-primary" style="flex: 2;" id="cooking-next">Avanti ➡️</button>`
                        : `<button class="btn btn-primary" style="flex: 2; background: #10b981;" id="cooking-finish">🏁 Fine e Conferma</button>`
                    }
                </div>
            </div>
        `;

        const prevBtn = document.getElementById('cooking-prev');
        const nextBtn = document.getElementById('cooking-next');
        const finishBtn = document.getElementById('cooking-finish');

        if (prevBtn) prevBtn.onclick = () => { currentStep--; updateView(); };
        if (nextBtn) nextBtn.onclick = () => { currentStep++; updateView(); };
        if (finishBtn) finishBtn.onclick = () => {
            confirmMeal(date, type);
            closeModal();
            renderDashboard();
        };
    };

    updateView();
}

function closeModal() {
    document.getElementById('meal-modal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

function confirmMeal(date, type) {
    const day = appState.plan.find(p => p.date === date);
    if (day && day.meals[type]) {
        day.meals[type].confirmed = !day.meals[type].confirmed;
        debouncedSave();
        renderDashboard();
    }
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

function saveProfile(e) {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('edit-weight').value);
    const height = parseInt(document.getElementById('edit-height').value);
    const activity = parseFloat(document.getElementById('edit-activity').value);
    const goal = document.getElementById('edit-goal').value;
    const diet = document.getElementById('edit-diet').value;
    const dislikes = document.getElementById('edit-dislikes').value;

    appState.user.weight = weight;
    appState.user.height = height;
    appState.user.activity_level = activity;
    appState.user.goal = goal;
    appState.user.diet_type = diet;
    appState.user.dislikes = dislikes;

    // Recalculate using nutrition.js functions
    const bmiInfo = calculateBMI(weight, height);
    const bmr = calculateBMR(weight, height, appState.user.age, appState.user.gender);
    const tdee = calculateTDEE(bmr, activity);
    
    appState.user.bmi = bmiInfo.bmi;
    appState.user.bmiCategory = bmiInfo.category;
    appState.user.targetCalories = calculateTargetCalories(tdee, goal);

    debouncedSave();
    
    // Refresh view
    renderProfile();
    
    const feedback = document.getElementById('profile-save-feedback');
    if (feedback) {
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
    }
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
    const container = document.getElementById('monthly-calendar-container');
    if (!container) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Day index (0=Sun, 1=Mon... 6=Sat) - convert to 0=Mon... 6=Sun
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

    // Empty cells padding
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
        console.error("NutriPlan: _supabase is not defined! Check supabase-client.js");
        alert("Errore critico: Impossibile connettersi a Supabase. Controlla la console.");
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

    // Safety timeout: hide loader after 10s even if something hangs
    setTimeout(() => {
        const loader = document.getElementById('global-loader');
        if (loader && loader.style.display !== 'none') {
            console.warn("NutriPlan: Safety loader hide triggered.");
            hideLoader();
        }
    }, 10000);

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

window.confirmMeal = confirmMeal;
