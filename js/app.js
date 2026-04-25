/**
 * NutriPlan - Main Application Logic
 * v2.9.2 Premium
 */

// State management
const appState = {
    user: null,
    profile: null,
    plan: [],
    currentView: 'auth',
    recipes: []
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("NutriPlan: App initializing...");
    
    // Auth state listener
    _supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("NutriPlan: Auth state changed:", event);
        try {
            if (session) {
                appState.user = session.user;
                await fetchRecipesFromSupabase();
                const hasProfile = await loadFromCloud();
                if (hasProfile) {
                    showView('dashboard');
                    renderDashboard();
                } else {
                    showView('onboarding');
                }
            } else {
                appState.user = null;
                appState.profile = null;
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

    // Event Bindings with safety checks
    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) btnCloseModal.onclick = closeModal;

    const mealModal = document.getElementById('meal-modal');
    if (mealModal) {
        mealModal.onclick = (e) => {
            if (e.target === mealModal) closeModal();
        };
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.onsubmit = handleLoginSubmit;

    const onboardingForm = document.getElementById('onboarding-form');
    if (onboardingForm) onboardingForm.onsubmit = handleOnboardingSubmit;
    
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.onclick = () => _supabase.auth.signOut();
});

// --- UI Logic ---
function showView(viewId) {
    console.log(`NutriPlan: Switching to view ${viewId}`);
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('fade-in');
    }
    
    // Update bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const view = item.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (view === viewId) item.classList.add('active');
    });

    appState.currentView = viewId;
    
    // Trigger specific render logic
    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'calendar') renderCalendar();
    if (viewId === 'shopping') renderShoppingList();
    if (viewId === 'profile') renderProfile();
}

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

function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.remove('hidden');
        toast.classList.add('fade-in');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// --- Auth Handlers ---
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit');
    const errDiv = document.getElementById('auth-error');

    try {
        btn.disabled = true;
        btn.textContent = 'Accesso in corso...';
        errDiv.classList.add('hidden');

        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (err) {
        errDiv.textContent = err.message;
        errDiv.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Accedi';
    }
}

async function handleOnboardingSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const errDiv = document.getElementById('onboarding-error');

    try {
        btn.disabled = true;
        btn.textContent = 'Creazione piano...';
        errDiv.classList.add('hidden');

        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        
        // 1. Sign Up
        const { data: authData, error: authError } = await _supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        appState.user = authData.user;

        // 2. Profile Data
        const profile = {
            age: parseInt(document.getElementById('age').value),
            gender: document.getElementById('gender').value,
            weight: parseFloat(document.getElementById('weight').value),
            height: parseInt(document.getElementById('height').value),
            activity: parseFloat(document.getElementById('activity').value),
            dietType: document.getElementById('diet-type').value,
            goal: document.getElementById('goal').value,
            calories: calculateCalories({
                age: parseInt(document.getElementById('age').value),
                gender: document.getElementById('gender').value,
                weight: parseFloat(document.getElementById('weight').value),
                height: parseInt(document.getElementById('height').value),
                activity: parseFloat(document.getElementById('activity').value),
                goal: document.getElementById('goal').value
            })
        };

        appState.profile = profile;

        // 3. Generate Plan
        appState.plan = generateWeeklyPlan(profile, appState.recipes);

        // 4. Save to Cloud
        await saveToCloud();
        
        showView('dashboard');
        showToast("Benvenuto! Il tuo piano è pronto.");
    } catch (err) {
        errDiv.textContent = err.message;
        errDiv.classList.remove('hidden');
        window.scrollTo(0,0);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Inizia il tuo Percorso →';
    }
}

// --- Data Management ---
async function fetchRecipesFromSupabase() {
    try {
        const { data, error } = await _supabase.from('recipes').select('*');
        if (error) throw error;
        appState.recipes = data || [];
        console.log(`NutriPlan: Loaded ${appState.recipes.length} recipes.`);
    } catch (err) {
        console.error("Error fetching recipes:", err);
        // Fallback to empty or static if needed
    }
}

async function saveToCloud() {
    if (!appState.user) return;
    try {
        const { error } = await _supabase.from('profiles').upsert({
            id: appState.user.id,
            profile_data: appState.profile,
            current_plan: appState.plan,
            updated_at: new Date()
        });
        if (error) throw error;
    } catch (err) {
        console.error("Cloud save error:", err);
    }
}

async function loadFromCloud() {
    if (!appState.user) return false;
    try {
        const { data, error } = await _supabase.from('profiles').select('*').eq('id', appState.user.id).single();
        if (error) return false;
        if (data) {
            appState.profile = data.profile_data;
            appState.plan = data.current_plan || [];
            return true;
        }
    } catch (err) {
        console.error("Cloud load error:", err);
    }
    return false;
}

// --- Rendering ---
function renderDashboard() {
    const container = document.getElementById('dashboard-content');
    const title = document.getElementById('dashboard-title');
    const subtitle = document.getElementById('dashboard-subtitle');
    
    if (!container) return;
    
    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = `<div class="text-center" style="padding:4rem 0;">
            <p class="text-secondary">Nessun piano attivo.</p>
            <button class="btn btn-primary" onclick="showView('onboarding')">Genera ora</button>
        </div>`;
        return;
    }

    title.textContent = "Piano Settimanale";
    subtitle.innerHTML = `Obiettivo: <span class="highlight">${appState.profile.calories} kcal/giorno</span>`;

    let html = '';
    appState.plan.forEach((day, dayIdx) => {
        const isToday = new Date().toLocaleDateString('it-IT', { weekday: 'long' }).toLowerCase() === day.day.toLowerCase();
        
        html += `
        <div class="day-section ${isToday ? 'is-today' : ''}">
            <div class="day-header-premium">
                <div class="day-info">
                    ${isToday ? '<span class="today-badge">OGGI</span>' : ''}
                    <h3 class="day-name">${day.day}</h3>
                    <span class="day-date">${day.date || ''}</span>
                </div>
            </div>
            <div class="meals-container-premium">
                ${renderMealCard(day.meals.breakfast, 'breakfast', day.date)}
                ${renderMealCard(day.meals.lunch, 'lunch', day.date)}
                ${renderMealCard(day.meals.snack, 'snack', day.date)}
                ${renderMealCard(day.meals.dinner, 'dinner', day.date)}
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

function renderMealCard(meal, type, date) {
    const icons = { breakfast: '☕', lunch: '🍝', snack: '🍎', dinner: '🥗' };
    const labels = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino', dinner: 'Cena' };
    const isConfirmed = meal.confirmed || false;

    return `
    <div class="meal-card-premium ${isConfirmed ? 'is-confirmed' : ''}" onclick="showMealDetails('${meal.id}', '${date}', '${type}')">
        <div class="meal-card-header">
            <div class="meal-icon">${icons[type]}</div>
            <div class="meal-type-label">${labels[type]}</div>
        </div>
        <h4 class="meal-title">${meal.name}</h4>
        <div class="meal-smart-tag">
            <span>🔥 ${meal.calories} kcal</span>
            <span>•</span>
            <span>${meal.category || 'Bilanciato'}</span>
        </div>
        <div class="meal-footer">
            <div class="meal-stats">
                <span>P: ${meal.macros?.protein || 0}g</span>
                <span>C: ${meal.macros?.carbs || 0}g</span>
                <span>F: ${meal.macros?.fat || 0}g</span>
            </div>
            <div class="meal-actions" onclick="event.stopPropagation()">
                <button class="action-btn swap" title="Cambia" onclick="app.swapMeal('${date}', '${type}')">🔄</button>
                <button class="action-btn confirm ${isConfirmed ? 'active' : ''}" onclick="app.toggleConfirm('${date}', '${type}')">
                    ${isConfirmed ? '✅' : 'Conferma'}
                </button>
            </div>
        </div>
    </div>`;
}

function showMealDetails(recipeId, date, type) {
    const recipe = appState.recipes.find(r => r.id === recipeId) || appState.plan.find(p => p.date === date)?.meals[type];
    if (!recipe) return;

    const details = document.getElementById('meal-details');
    details.innerHTML = `
        <div class="recipe-detail-header">
            <h2 style="font-size: 1.8rem; margin-bottom: 0.5rem;">${recipe.name}</h2>
            <div class="meal-smart-tag" style="display:inline-flex;">${recipe.calories} kcal • ${recipe.category}</div>
        </div>
        
        <div style="margin: 2rem 0;">
            <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">🛒 Ingredienti</h3>
            <ul style="list-style: none;">
                ${recipe.ingredients.map(ing => `
                    <li style="padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between;">
                        <span>${ing.name}</span>
                        <span style="font-weight: 700; color: var(--accent-primary);">${ing.amount} ${ing.unit}</span>
                    </li>
                `).join('')}
            </ul>
        </div>

        <div style="margin: 2rem 0;">
            <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0.5rem;">👨‍🍳 Istruzioni</h3>
            <div class="steps-container">
                ${recipe.instructions ? recipe.instructions.split('.').filter(s => s.trim()).map((step, i) => `
                    <div style="display: flex; gap: 1rem; margin-bottom: 1.25rem;">
                        <div style="width: 28px; height: 28px; background: var(--accent-primary); color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 800; font-size: 0.8rem;">${i+1}</div>
                        <p style="color: var(--text-secondary); font-size: 0.95rem;">${step.trim()}.</p>
                    </div>
                `).join('') : '<p>Segui la ricetta standard per questo piatto.</p>'}
            </div>
        </div>
    `;

    document.getElementById('meal-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('meal-modal').classList.add('hidden');
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    // Standard monthly calendar logic
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    let html = '';
    const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    dayNames.forEach(d => html += `<div class="calendar-day-header" data-short="${d[0]}"><span>${d}</span></div>`);

    // Padding for first day
    let startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) html += `<div class="calendar-day-cell empty"></div>`;

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const isToday = d === now.getDate();
        html += `
        <div class="calendar-day-cell ${isToday ? 'is-today' : ''}">
            <span class="calendar-date-number">${d}</span>
            <div class="daily-progress-container">
                <div class="daily-progress-bar" style="width: ${isToday ? '40%' : '0%'}"></div>
            </div>
        </div>`;
    }

    grid.innerHTML = html;
}

function renderShoppingList() {
    const container = document.getElementById('shopping-list-content');
    if (!container) return;

    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = '<p class="text-center text-secondary">Nessun piano attivo per generare la lista.</p>';
        return;
    }

    const ingredients = {};
    appState.plan.forEach(day => {
        Object.values(day.meals).forEach(meal => {
            meal.ingredients.forEach(ing => {
                if (!ingredients[ing.name]) ingredients[ing.name] = { amount: 0, unit: ing.unit };
                ingredients[ing.name].amount += parseFloat(ing.amount) || 0;
            });
        });
    });

    let html = '<div class="shopping-category">';
    html += '<h3 class="shopping-category-title">🛒 Tutti gli Ingredienti</h3>';
    html += '<div class="shopping-items-list">';
    Object.entries(ingredients).forEach(([name, data]) => {
        html += `
        <div class="shopping-item">
            <input type="checkbox">
            <span class="shopping-item-name">${name}</span>
            <span class="shopping-item-amount">${Math.round(data.amount)} ${data.unit}</span>
        </div>`;
    });
    html += '</div></div>';

    container.innerHTML = html;
}

function renderProfile() {
    const container = document.getElementById('profile-content');
    if (!container) return;

    const p = appState.profile;
    container.innerHTML = `
        <div class="profile-summary-grid">
            <div class="profile-stat-card">
                <div class="profile-stat-label">Peso</div>
                <div class="profile-stat-value">${p.weight} <span class="profile-stat-unit">kg</span></div>
            </div>
            <div class="profile-stat-card">
                <div class="profile-stat-label">Altezza</div>
                <div class="profile-stat-value">${p.height} <span class="profile-stat-unit">cm</span></div>
            </div>
            <div class="profile-stat-card">
                <div class="profile-stat-label">Dieta</div>
                <div class="profile-stat-value" style="font-size:1.1rem;">${p.dietType}</div>
            </div>
            <div class="profile-stat-card">
                <div class="profile-stat-label">Obiettivo</div>
                <div class="profile-stat-value" style="font-size:1.1rem;">${p.goal}</div>
            </div>
        </div>
        
        <div class="glass-panel" style="padding: 2rem;">
            <h3 style="margin-bottom:1.5rem;">Modifica Profilo</h3>
            <button class="btn btn-primary" style="width:100%;" onclick="showView('onboarding')">Aggiorna Dati e Rigenera Piano</button>
            <p class="text-secondary" style="font-size:0.8rem; margin-top:1rem; text-align:center;">
                L'aggiornamento dei dati ricalcolerà il tuo fabbisogno calorico giornaliero.
            </p>
        </div>
    `;
}

// --- App State Actions ---
const app = {
    showView,
    clearShoppingList: () => {
        if (confirm("Vuoi svuotare la lista?")) renderShoppingList();
    },
    swapMeal: (date, type) => {
        const dayIdx = appState.plan.findIndex(p => p.date === date);
        if (dayIdx === -1) return;
        
        const currentMeal = appState.plan[dayIdx].meals[type];
        const alternatives = appState.recipes.filter(r => 
            r.category === currentMeal.category && r.id !== currentMeal.id
        );
        
        if (alternatives.length > 0) {
            const next = alternatives[Math.floor(Math.random() * alternatives.length)];
            appState.plan[dayIdx].meals[type] = { ...next, confirmed: false };
            saveToCloud();
            renderDashboard();
            showToast("Piatto sostituito!");
        } else {
            showToast("Nessuna alternativa trovata.");
        }
    },
    toggleConfirm: (date, type) => {
        const dayIdx = appState.plan.findIndex(p => p.date === date);
        if (dayIdx === -1) return;
        
        const meal = appState.plan[dayIdx].meals[type];
        meal.confirmed = !meal.confirmed;
        saveToCloud();
        renderDashboard();
    }
};

window.app = app;
