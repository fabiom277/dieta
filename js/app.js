const appState = {
    user: JSON.parse(localStorage.getItem('nutriplan_user')) || null,
    plan: JSON.parse(localStorage.getItem('nutriplan_plan')) || [],
    shoppingList: [],
    view: 'dashboard'
};

const supabaseClient = window.supabase ? window.supabase.createClient(
    window.CONFIG.SUPABASE_URL,
    window.CONFIG.SUPABASE_ANON_KEY
) : null;

// ============================================================
// Auth & Initialization
// ============================================================

async function initApp() {
    console.log('App Initializing...');
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        appState.user = {
            ...appState.user,
            id: session.user.id,
            email: session.user.email
        };
        await syncFromSupabase();
    }

    if (!appState.user) {
        showView('onboarding');
    } else if (appState.plan.length === 0) {
        showView('onboarding');
    } else {
        showView('dashboard');
    }

    setupNav();
}

function setupNav() {
    document.querySelectorAll('#main-nav button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.id.replace('btn-', '');
            showView(view);
        });
    });
    
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
}

// ============================================================
// Navigation & Views
// ============================================================

function showView(viewName) {
    appState.view = viewName;
    
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('#main-nav button').forEach(btn => {
        btn.classList.toggle('active', btn.id === `btn-${viewName}`);
    });

    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'calendar') renderMonthlyCalendar();
    if (viewName === 'shopping') renderShoppingList();
    if (viewName === 'profile') renderProfile();
    
    window.scrollTo(0, 0);
}

// ============================================================
// Dashboard Rendering
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
        <div class="dashboard-header" style="margin-bottom: 3rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 2rem;">
            <div>
                <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; letter-spacing: -0.03em;">Il Tuo Piano <span class="highlight">Settimanale</span></h1>
                <div style="display: flex; gap: 1.5rem; margin-top: 1rem; align-items: center;">
                    <p class="text-muted" style="font-size: 1.1rem;">Settimana del ${new Date(visiblePlan[0].date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</p>
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 0.4rem 1rem; border-radius: 50px; border: 1px solid rgba(16, 185, 129, 0.2); font-weight: 700; color: var(--accent-primary);">
                        🎯 ${appState.user.targetCalories} kcal / giorno
                    </div>
                </div>
            </div>
        </div>
    `;

    html += `<div class="calendar-grid" style="display: flex; flex-direction: column; gap: 2.5rem;">`;

    visiblePlan.forEach(day => {
        let totalCals = 0;
        Object.values(day.meals).forEach(m => totalCals += (m.calories || 0));
        const isToday = day.date === today;

        html += `
            <div class="day-section" style="${isToday ? 'background: rgba(16, 185, 129, 0.03); border-radius: 20px; padding: 1.5rem; border: 1px solid rgba(16, 185, 129, 0.1);' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 style="text-transform:capitalize; font-size: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                        ${isToday ? '<span style="background: var(--accent-primary); color: #fff; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; vertical-align: middle;">OGGI</span>' : ''}
                        ${new Date(day.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </h2>
                    <span style="font-weight:800; font-size: 1.2rem; color: var(--text-secondary); opacity: 0.8;">${Math.round(totalCals)} <span style="font-size: 0.8rem; font-weight: 500;">kcal totali</span></span>
                </div>
                <div class="meals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem;">
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
        <div class="meal-card" onclick="openMealDetails('${date}', '${type}')" style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 16px; transition: all 0.2s ease; position: relative; overflow: hidden;">
            <div class="meal-tag" style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 800; margin-bottom: 0.75rem; letter-spacing: 0.05em;">${labels[type].toUpperCase()}</div>
            <h3 style="margin-bottom:0.75rem; font-size:1.15rem; line-height: 1.3; font-weight: 700;">${meal.name}</h3>
            
            ${meal.smartAddition ? `<div class="smart-addition-tag" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; margin-bottom: 1rem; border: 1px solid rgba(59, 130, 246, 0.1);">+ ${meal.smartAddition.amount}${meal.smartAddition.unit} ${meal.smartAddition.name}</div>` : ''}
            
            <div style="display:flex; gap:1.25rem; margin-top:auto; font-size:0.85rem; font-weight: 600; color: var(--text-secondary);">
                <span>🔥 ${Math.round(meal.calories)} <span style="font-size: 0.7rem; opacity: 0.7;">kcal</span></span>
                <span>🥩 ${Math.round(meal.macros.protein * (meal.portion || 1))}g <span style="font-size: 0.7rem; opacity: 0.7;">pro</span></span>
            </div>

            <div style="display:flex; gap:0.5rem; margin-top:1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <button class="btn-swap" style="flex: 1; background: ${meal.confirmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)'}; color: ${meal.confirmed ? 'var(--accent-primary)' : 'var(--text-primary)'}; border: 1px solid ${meal.confirmed ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)'}; padding: 0.5rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); confirmMeal('${date}', '${type}')">
                    ${meal.confirmed ? '✓ Confermata' : 'Conferma'}
                </button>
                <button class="btn-swap" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--glass-border); padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer;" onclick="event.stopPropagation(); swapMeal('${date}', '${type}')">🔄</button>
            </div>
        </div>
    `;
}

function openMealDetails(date, type) {
    const day = appState.plan.find(p => p.date === date);
    if (!day) return;
    const meal = day.meals[type];
    if (!meal) return;

    const modal = document.getElementById('recipe-modal');
    const body = document.getElementById('recipe-detail-body');
    
    // Use recipe steps or fallback
    const stepsHtml = meal.instructions ? 
        meal.instructions.map((s, i) => `<li>${s}</li>`).join('') : 
        '<li>Nessuna istruzione disponibile per questa ricetta.</li>';

    body.innerHTML = `
        <img src="${meal.image || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800'}" class="recipe-header-img" alt="${meal.name}">
        <div class="recipe-body">
            <h2 style="font-size: 2rem; margin-bottom: 1.5rem;">${meal.name}</h2>
            
            <div class="recipe-meta">
                <div class="meta-item">
                    <span class="label">Calorie</span>
                    <span class="value">${Math.round(meal.calories)} kcal</span>
                </div>
                <div class="meta-item">
                    <span class="label">Proteine</span>
                    <span class="value">${Math.round(meal.macros.protein * (meal.portion || 1))}g</span>
                </div>
                <div class="meta-item">
                    <span class="label">Carboidrati</span>
                    <span class="value">${Math.round(meal.macros.carbs * (meal.portion || 1))}g</span>
                </div>
                <div class="meta-item">
                    <span class="label">Grassi</span>
                    <span class="value">${Math.round(meal.macros.fat * (meal.portion || 1))}g</span>
                </div>
            </div>

            <div class="recipe-section">
                <h4>🥗 Ingredienti</h4>
                <div style="display:grid; gap:0.5rem;">
                    ${meal.ingredients.map(ing => `
                        <div class="ingredient-check-item">
                            <input type="checkbox">
                            <span>${Math.round(ing.amount * (meal.portion || 1))} ${ing.unit} ${ing.name}</span>
                        </div>
                    `).join('')}
                    ${meal.smartAddition ? `
                        <div class="ingredient-check-item" style="border: 1px dashed var(--accent-primary);">
                            <input type="checkbox">
                            <span style="color:var(--accent-primary);">+ ${meal.smartAddition.amount}${meal.smartAddition.unit} ${meal.smartAddition.name} (Aggiunta Smart)</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="recipe-section">
                <h4>👨‍🍳 Preparazione</h4>
                <ol>${stepsHtml}</ol>
            </div>
            
            ${meal.sourceUrl ? `
                <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--glass-border);">
                    <a href="${meal.sourceUrl}" target="_blank" class="btn btn-outline" style="width:100%;">Vedi Ricetta Originale</a>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function closeRecipeModal() {
    document.getElementById('recipe-modal').classList.add('hidden');
}

// ============================================================
// Profile Management
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
        <!-- Summary View -->
        <div id="profile-summary" style="margin-bottom: 2rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div class="glass-panel" style="padding: 1.25rem; text-align: center; border-radius: 16px;">
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">Peso</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">${u.weight} <span style="font-size: 0.9rem; font-weight: 500;">kg</span></div>
                </div>
                <div class="glass-panel" style="padding: 1.25rem; text-align: center; border-radius: 16px;">
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">Altezza</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">${u.height} <span style="font-size: 0.9rem; font-weight: 500;">cm</span></div>
                </div>
                <div class="glass-panel" style="padding: 1.25rem; text-align: center; border-radius: 16px;">
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">BMI</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-primary);">${u.bmi || '--'}</div>
                    <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">${u.bmiCategory || ''}</div>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div style="display: flex; justify-content: space-between; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="color: var(--text-secondary);">Età / Sesso</span>
                    <span style="font-weight: 700;">${u.age} anni, ${labels.gender}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="color: var(--text-secondary);">Attività</span>
                    <span style="font-weight: 700;">${labels.activity[u.activity_level] || u.activity_level}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="color: var(--text-secondary);">Obiettivo</span>
                    <span style="font-weight: 700;">${labels.goal[u.goal] || u.goal}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <span style="color: var(--text-secondary);">Tipo di Dieta</span>
                    <span style="font-weight: 700; color: var(--accent-primary);">${labels.diet[u.diet_type] || u.diet_type || 'Standard'}</span>
                </div>
                <div style="padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--glass-border);">
                    <div style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.9rem;">Esclusioni</div>
                    <div style="font-weight: 600;">${u.excluded_foods?.length ? u.excluded_foods.join(', ') : 'Nessuna'}</div>
                </div>
            </div>

            <button class="btn btn-outline" style="width: 100%; margin-top: 2rem; border: 1px dashed var(--glass-border); color: var(--text-secondary);" onclick="document.getElementById('profile-summary').classList.add('hidden'); document.getElementById('edit-profile-form').classList.remove('hidden');">
                ✏️ Modifica Dati Profilo
            </button>
        </div>

        <!-- Edit Form (Hidden by default) -->
        <form id="edit-profile-form" class="hidden" onsubmit="saveProfile(event)">
            <h3 style="margin-bottom: 1.5rem; font-size: 1.1rem;">Modifica Profilo</h3>
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
                        <option value="1.2" ${u.activity_level == 1.2 ? 'selected' : ''}>Sedentario</option>
                        <option value="1.375" ${u.activity_level == 1.375 ? 'selected' : ''}>Leggero</option>
                        <option value="1.55" ${u.activity_level == 1.55 ? 'selected' : ''}>Moderato</option>
                        <option value="1.725" ${u.activity_level == 1.725 ? 'selected' : ''}>Attivo</option>
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
                <div class="form-group">
                    <label>Tipo di Dieta</label>
                    <select id="edit-diet">
                        <option value="standard" ${u.diet_type === 'standard' ? 'selected' : ''}>Standard</option>
                        <option value="vegetarian" ${u.diet_type === 'vegetarian' ? 'selected' : ''}>Vegetariana</option>
                        <option value="vegan" ${u.diet_type === 'vegan' ? 'selected' : ''}>Vegana</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin-top: 1rem;">
                <label>Cibi da evitare</label>
                <textarea id="edit-dislikes" rows="1">${u.excluded_foods?.join(', ') || ''}</textarea>
            </div>
            <div style="margin-top: 2rem; display: flex; gap: 1rem; align-items: center;">
                <button type="submit" class="btn btn-primary" style="flex: 1;">💾 Salva Modifiche</button>
                <button type="button" class="btn btn-outline" style="flex: 1;" onclick="renderProfile()">Annulla</button>
            </div>
            <div id="profile-save-feedback" style="color: #10b981; font-weight: bold; text-align: center; margin-top: 1rem; opacity: 0; transition: opacity 0.3s;">Salvato!</div>
        </form>
    `;
}

async function saveProfile(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;

    const data = {
        weight: parseFloat(document.getElementById('edit-weight').value),
        height: parseFloat(document.getElementById('edit-height').value),
        activity_level: parseFloat(document.getElementById('edit-activity').value),
        goal: document.getElementById('edit-goal').value,
        diet_type: document.getElementById('edit-diet').value,
        excluded_foods: document.getElementById('edit-dislikes').value.split(',').map(s => s.trim()).filter(Boolean)
    };

    // Calculate BMI
    const hM = data.height / 100;
    data.bmi = (data.weight / (hM * hM)).toFixed(1);
    
    if (data.bmi < 18.5) data.bmiCategory = 'Sottopeso';
    else if (data.bmi < 25) data.bmiCategory = 'Normopeso';
    else if (data.bmi < 30) data.bmiCategory = 'Sovrappeso';
    else data.bmiCategory = 'Obeso';

    appState.user = { ...appState.user, ...data };
    
    // Calculate new target calories
    const bmr = calculateBMR(appState.user);
    appState.user.targetCalories = calculateTargetCalories(bmr, appState.user.goal);

    localStorage.setItem('nutriplan_user', JSON.stringify(appState.user));
    
    try {
        await syncToSupabase();
        const feedback = document.getElementById('profile-save-feedback');
        feedback.style.opacity = '1';
        setTimeout(() => { 
            feedback.style.opacity = '0';
            renderProfile(); // Go back to summary
        }, 1500);
    } catch (err) {
        console.error('Save failed:', err);
    } finally {
        btn.disabled = false;
    }
}

// ============================================================
// Calendar Logic
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
    
    // Day index (0=Sun, 1=Mon... 6=Sat) - convert to 1=Mon... 7=Sun
    let startOffset = firstDay.getDay();
    if (startOffset === 0) startOffset = 7;
    startOffset--; // Now 0=Mon... 6=Sun

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
            <div class="calendar-day-cell ${isToday ? 'is-today' : ''}" style="position: relative;">
                <div class="calendar-date-number" style="font-weight: ${isToday ? '800' : '600'}; color: ${isToday ? 'var(--accent-primary)' : 'var(--text-secondary)'};">${d}</div>
                ${dayPlan ? `
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        ${Object.entries(dayPlan.meals).map(([type, m]) => {
                            if (!m) return '';
                            const icons = { breakfast: '☕', lunch: '🍝', snack: '🍎', dinner: '🌙' };
                            return `<div class="calendar-meal-chip ${type} ${m.confirmed ? 'confirmed' : ''}" 
                                         onclick="openMealDetails('${dateStr}', '${type}')" 
                                         style="font-size: 0.65rem; padding: 2px 4px; border-radius: 4px; ${m.confirmed ? 'border: 1px solid var(--accent-primary);' : ''}">
                                    ${icons[type]} <span class="chip-text">${m.name}</span>
                                    ${m.confirmed ? ' <span style="font-size: 0.5rem;">✅</span>' : ''}
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

// ============================================================
// Meal Actions
// ============================================================

function confirmMeal(date, type) {
    const day = appState.plan.find(p => p.date === date);
    if (day && day.meals[type]) {
        day.meals[type].confirmed = !day.meals[type].confirmed;
        localStorage.setItem('nutriplan_plan', JSON.stringify(appState.plan));
        syncToSupabase();
        
        // Re-render based on current view
        if (appState.view === 'dashboard') renderDashboard();
        if (appState.view === 'calendar') renderMonthlyCalendar();
    }
}

async function swapMeal(date, type) {
    const day = appState.plan.find(p => p.date === date);
    if (!day) return;

    // Call global library (nutriplan.js) to get a new meal
    const newMeal = window.generateSingleMeal(type, appState.user);
    if (newMeal) {
        day.meals[type] = newMeal;
        localStorage.setItem('nutriplan_plan', JSON.stringify(appState.plan));
        await syncToSupabase();
        renderDashboard();
    }
}

// ============================================================
// Shopping List
// ============================================================

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
    let plan = appState.plan.filter(p => p.date >= today).slice(0, 31);
    
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

    // ----- Categorize ingredients -----
    const CATEGORIES = {
        '🥩 Carne & Pesce':   ['pollo','manzo','salmone','tonno','merluzzo','tacchino','maiale','prosciutto','bresaola','speck','sgombro','gamberi','cozze','vongole','pesce','carne','filetto','bistecca','cotoletta','hamburger','wurstel','macinato'],
        '🥛 Latticini & Uova': ['latte','panna','yogurt','burro','mozzarella','parmigiano','pecorino','ricotta','uova','uovo','formaggio','grana','emmental','stracchino','mascarpone','gorgonzola','feta','skyr'],
        '🍞 Pane & Cereali':   ['pane','pasta','riso','farro','orzo','avena','farina','semola','crackers','grissini','pancarré','pangrattato','polenta','lasagne','gnocchi','couscous','quinoa','fette biscottate','cereali','muesli'],
        '🫒 Condimenti & Grassi': ['olio','aceto','sale','pepe','zucchero','miele','salsa','maionese','ketchup','senape','dado','brodo','pesto','tahini','soia','crema'],
        '🌿 Spezie & Aromi':   ['aglio','cipolla','prezzemolo','basilico','rosmarino','origano','timo','menta','zenzero','curcuma','paprika','cannella','peperoncino','curry','alloro','salvia','erba','noce moscata'],
        '🥫 Conserve & Scatolame': ['pomodori','passata','pelati','legumi','fagioli','ceci','lenticchie','mais','tonno in scatola','sardine','acciughe','olive','capperi','funghi secchi','concentrato'],
        '🫙 Frutta Secca & Semi': ['noci','mandorle','nocciole','pistacchi','anacardi','pinoli','semi di','sesamo','lino','girasole','chia','cocco','burro d\'arachidi'],
        '🍎 Frutta':           ['mele','banane','arance','limone','lime','fragole','mirtilli','lamponi','pesche','pere','uva','kiwi','melone','anguria','ananas','avocado','mango','pompelmo'],
        '🥦 Verdure':          ['spinaci','zucchine','carote','broccoli','cavolfiore','cavolo','melanzane','peperoni','pomodori freschi','lattuga','insalata','sedano','finocchio','asparagi','piselli','carciofi','radicchio','bietole','patate','cipollotti','rucola','valeriana','zucca','porri','fagiolini'],
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

    const catOrder = Object.keys(CATEGORIES).concat(['🛒 Altro']);
    const sortedCats = catOrder.filter(c => grouped[c]);

    let html = sortedCats.map(cat => `
        <div style="margin-bottom: 2rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 1rem; letter-spacing: 0.05em; border-left: 3px solid var(--accent-primary); padding-left: 0.75rem;">${cat.toUpperCase()}</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;">
                ${grouped[cat].map(item => `
                    <label style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.75rem 1rem; cursor: pointer; transition: all 0.2s;">
                        <span style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
                            <input type="checkbox" class="ingredient-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 0.95rem; font-weight: 500; line-height: 1.2; color: var(--text-primary);">${item.name}</span>
                        </span>
                        <span style="font-weight: 700; color: var(--accent-primary); white-space: nowrap; font-size: 0.9rem; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;">${Math.round(item.amount)} ${item.unit}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `).join('');

    container.innerHTML = html || '<p class="text-center text-muted">Nessun ingrediente trovato per i giorni selezionati.</p>';
}

// ============================================================
// Sync Utilities
// ============================================================

async function syncToSupabase() {
    if (!supabaseClient || !appState.user?.id) return;
    
    await supabaseClient.from('user_profiles').upsert({
        user_id: appState.user.id,
        profile_data: appState.user,
        updated_at: new Date()
    });

    await supabaseClient.from('user_plans').upsert({
        user_id: appState.user.id,
        plan_data: appState.plan,
        updated_at: new Date()
    });
}

async function syncFromSupabase() {
    if (!supabaseClient || !appState.user?.id) return;

    const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('profile_data')
        .eq('user_id', appState.user.id)
        .single();

    if (profile) {
        appState.user = { ...appState.user, ...profile.profile_data };
        localStorage.setItem('nutriplan_user', JSON.stringify(appState.user));
    }

    const { data: plan } = await supabaseClient
        .from('user_plans')
        .select('plan_data')
        .eq('user_id', appState.user.id)
        .single();

    if (plan) {
        appState.plan = plan.plan_data;
        localStorage.setItem('nutriplan_plan', JSON.stringify(appState.plan));
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('nutriplan_user');
    localStorage.removeItem('nutriplan_plan');
    window.location.reload();
}

// ============================================================
// Helpers
// ============================================================

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

// Global Export
window.app = { initApp, showView, renderShoppingList, closeRecipeModal };
document.addEventListener('DOMContentLoaded', initApp);
