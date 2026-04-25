// State
let currentUser = null;
let appState = {
    user: null,
    plan: [],
    recipes: []
};

// DOM Refs
let views = {};
let navButtons = {};
let loader = null;

function initDomRefs() {
    loader = document.getElementById('global-loader');
    ['auth', 'onboarding', 'dashboard', 'calendar', 'shopping', 'profile'].forEach(v => {
        views[v] = document.getElementById(\`view-\${v}\`);
    });
    ['dashboard', 'calendar', 'shopping', 'profile'].forEach(n => {
        navButtons[n] = document.getElementById(\`nav-\${n}\`);
    });
}

function showLoader() { if (loader) loader.style.display = 'flex'; }
function hideLoader() { if (loader) loader.style.display = 'none'; }

function showView(viewName) {
    Object.values(views).forEach(v => v?.classList.add('hidden'));
    views[viewName]?.classList.remove('hidden');

    Object.values(navButtons).forEach(b => b?.classList.remove('active'));
    navButtons[viewName]?.classList.add('active');

    const nav = document.getElementById('main-nav');
    if (viewName === 'auth' || viewName === 'onboarding') {
        nav?.classList.add('hidden');
    } else {
        nav?.classList.remove('hidden');
    }

    if (viewName === 'dashboard') renderDashboard();
    if (viewName === 'calendar') renderMonthlyCalendar();
    if (viewName === 'shopping') renderShoppingDaySelector();
    if (viewName === 'profile') renderProfile();
    
    window.scrollTo(0, 0);
}

// ============================================================
// AUTH & SYNC
// ============================================================

async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorBox = document.getElementById('auth-error');
    
    errorBox.classList.add('hidden');
    showLoader();

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) {
        errorBox.textContent = "Errore: " + error.message;
        errorBox.classList.remove('hidden');
        hideLoader();
    }
}

async function handleOnboardingSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById('onboarding-error');
    errorBox.classList.add('hidden');
    showLoader();

    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    // 1. Create Auth User
    const { data: authData, error: authError } = await _supabase.auth.signUp({ email, password });
    
    if (authError) {
        if (authError.message.includes("already registered")) {
            // Se già registrato, proviamo a loggare
            const { error: logError } = await _supabase.auth.signInWithPassword({ email, password });
            if (logError) {
                errorBox.textContent = "Account esistente ma password errata.";
                errorBox.classList.remove('hidden');
                hideLoader();
                return;
            }
        } else {
            errorBox.textContent = authError.message;
            errorBox.classList.remove('hidden');
            hideLoader();
            return;
        }
    }

    // 2. Prepare Profile
    const profile = {
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        weight: parseFloat(document.getElementById('weight').value),
        height: parseInt(document.getElementById('height').value),
        activity: parseFloat(document.getElementById('activity').value),
        goal: document.getElementById('goal').value,
        diet_type: document.getElementById('diet-type').value,
        eating_pattern: document.getElementById('eating-pattern').value,
        dislikes: document.getElementById('dislikes').value,
        bannedRecipeIds: []
    };

    const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
    const tdee = calculateTDEE(bmr, profile.activity);
    profile.targetCalories = calculateTargetCalories(tdee, profile.goal);

    appState.user = profile;
    appState.plan = generateMonthlyPlan(profile);

    await saveToCloud();
    showView('dashboard');
    hideLoader();
}

async function fetchRecipesFromSupabase() {
    const { data, error } = await _supabase.from('recipes').select('*');
    if (!error && data) {
        recipesDB.length = 0;
        snacksDB.length = 0;
        data.forEach(r => {
            if (r.type === 'snack') snacksDB.push(r);
            else recipesDB.push(r);
        });
    }
}

async function saveToCloud() {
    if (!currentUser) return;
    const { error } = await _supabase.from('profiles').upsert({
        id: currentUser.id,
        profile_data: appState.user,
        plan_data: appState.plan,
        updated_at: new Date()
    });
    if (error) console.error("Cloud Save Error:", error);
}

async function loadFromCloud() {
    const { data, error } = await _supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    if (!error && data) {
        appState.user = data.profile_data;
        appState.plan = data.plan_data || [];
        return true;
    }
    return false;
}

const debouncedSave = (() => {
    let timeout;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(saveToCloud, 2000);
    };
})();

// ============================================================
// CORE LOGIC & RENDERING
// ============================================================

function renderDashboard() {
    const container = document.getElementById('calendar-grid');
    const today = getTodayISO();
    
    // Mostriamo solo i prossimi 7 giorni a partire da oggi
    const displayPlan = appState.plan.filter(p => p.date >= today).slice(0, 7);

    if (displayPlan.length === 0) {
        container.innerHTML = '<div class="glass-panel text-center"><p>Nessun piano trovato. Rigeneralo dal profilo.</p></div>';
        return;
    }

    const caloricInfo = document.getElementById('caloric-info');
    if (caloricInfo) caloricInfo.innerHTML = \`Fabbisogno: <span class="highlight">\${appState.user.targetCalories} kcal</span>/giorno\`;

    container.innerHTML = displayPlan.map(day => {
        const d = new Date(day.date);
        const dayLabel = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
        const isToday = day.date === today;

        return \`
            <div class="day-card \${isToday ? 'today' : ''} \${day.confirmed ? 'confirmed' : ''}">
                <div class="day-header">
                    <h3>\${dayLabel.toUpperCase()}</h3>
                    <span class="day-kcal">\${calculateDayCals(day)} kcal</span>
                </div>
                \${Object.entries(day.meals).map(([slot, meal]) => renderMealCard(day.date, slot, meal)).join('')}
                <div class="day-footer">
                    \${day.confirmed 
                        ? \`<button class="btn-unlock-day" onclick="confirmDay('\${day.date}', false)">Sblocca Giorno</button>\`
                        : \`<button class="btn-confirm-day" onclick="confirmDay('\${day.date}', true)">Conferma Giorno</button>\`
                    }
                </div>
            </div>
        \`;
    }).join('');
}

function calculateDayCals(day) {
    return Object.values(day.meals).reduce((sum, m) => sum + (m.calories || 0), 0);
}

function renderMealCard(date, slot, meal) {
    if (!meal) return '';
    const slotNames = { breakfast: 'Colazione', snack: 'Spuntino', lunch: 'Pranzo', dinner: 'Cena' };
    
    return \`
        <div class="meal-card" onclick="openMealDetails('\${date}', '\${slot}')">
            <div class="meal-tag">\${slotNames[slot]}</div>
            <div class="meal-name">\${meal.name}</div>
            <div class="meal-macros">
                <span>🔥 \${meal.calories} kcal</span>
                \${meal.smartAddition ? \`<span style="color:#60a5fa">+ \${meal.smartAddition.name}</span>\` : ''}
            </div>
        </div>
    \`;
}

// ============================================================
// MODAL & DETAILS
// ============================================================

function openMealDetails(date, slot) {
    const day = appState.plan.find(p => p.date === date);
    const meal = day.meals[slot];
    const container = document.getElementById('meal-details');
    
    container.innerHTML = \`
        <img src="\${meal.image_url || 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80'}" class="recipe-header-img">
        <div class="recipe-body">
            <div class="meal-tag">\${slot.toUpperCase()}</div>
            <h2 style="font-size: 2rem; margin-bottom: 1.5rem;">\${meal.name}</h2>
            
            <div class="recipe-meta">
                <div class="meta-item"><span class="label">Calorie</span><span class="value">\${meal.calories} kcal</span></div>
                <div class="meta-item"><span class="label">Proteine</span><span class="value">\${Math.round(meal.protein * (meal.portion||1))}g</span></div>
                <div class="meta-item"><span class="label">Carbi</span><span class="value">\${Math.round(meal.carbs * (meal.portion||1))}g</span></div>
                <div class="meta-item"><span class="label">Grassi</span><span class="value">\${Math.round(meal.fat * (meal.portion||1))}g</span></div>
            </div>

            <div class="recipe-section">
                <h4>🛒 Ingredienti (\${meal.portion > 1 ? 'Porzione abbondante' : '1 porzione'})</h4>
                <ul style="list-style: none; padding: 0;">
                    \${meal.ingredients.map(ing => \`
                        <li class="ingredient-check-item">
                            <span style="font-weight: 700; color: var(--accent-primary); min-width: 60px;">\${Math.round(ing.amount * (meal.portion||1))} \${ing.unit}</span>
                            <span>\${ing.name}</span>
                        </li>
                    \`).join('')}
                </ul>
                \${meal.smartAddition ? \`
                    <div class="smart-addition-tag">
                        <strong>💡 Nota:</strong> Aggiungi \${meal.smartAddition.amount}\${meal.smartAddition.unit} di \${meal.smartAddition.name} per bilanciare le calorie.
                    </div>
                \` : ''}
            </div>

            \${meal.instructions ? \`
                <div class="recipe-section">
                    <h4>👨‍🍳 Preparazione</h4>
                    <ol>
                        \${meal.instructions.map(step => \`<li>\${step}</li>\`).join('')}
                    </ol>
                </div>
            \` : ''}

            \${meal.source_url ? \`
                <div class="recipe-source-container">
                    <a href="\${meal.source_url}" target="_blank" class="recipe-source-link">
                        Vedi ricetta originale su GialloZafferano ↗
                    </a>
                </div>
            \` : ''}

            <div style="margin-top: 3rem; display: grid; gap: 1rem;">
                <button class="btn btn-primary" onclick="window.swapMeal('\${date}', '\${slot}'); app.closeModal()">🔄 Prova un'altra opzione</button>
                <button class="btn" style="background: rgba(255,255,255,0.05);" onclick="app.closeModal()">Chiudi</button>
            </div>
        </div>
    \`;

    document.getElementById('meal-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('meal-modal').classList.add('hidden');
}

function confirmDay(date, status) {
    const idx = appState.plan.findIndex(p => p.date === date);
    if (idx !== -1) {
        appState.plan[idx].confirmed = status;
        saveToCloud();
        renderDashboard();
    }
}

function confirmMeal(date, slot, status) {
    const idx = appState.plan.findIndex(p => p.date === date);
    if (idx !== -1) {
        appState.plan[idx].meals[slot].confirmed = status;
        saveToCloud();
        renderDashboard();
    }
}

// ============================================================
// MONTHLY CALENDAR
// ============================================================

function renderMonthlyCalendar() {
    const container = document.getElementById('monthly-calendar-container');
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    // Griglia: Intestazione giorni
    const daysNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    let html = '<div class="calendar-month-grid">';
    daysNames.forEach(d => html += \`<div class="calendar-day-header">\${d}</div>\`);

    const firstDay = new Date(year, month, 1);
    let startOffset = firstDay.getDay() - 1; // Lunedì = 0
    if (startOffset === -1) startOffset = 6; // Domenica

    // Celle vuote iniziali
    for (let i = 0; i < startOffset; i++) {
        html += '<div class="calendar-day-cell empty"></div>';
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = getTodayISO();

    for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const dayData = appState.plan.find(p => p.date === dateStr);
        const isToday = dateStr === todayStr;

        html += \`
            <div class="calendar-day-cell \${isToday ? 'is-today' : ''}">
                <div class="calendar-date-number">\${d}</div>
                \${dayData ? Object.entries(dayData.meals).map(([slot, m]) => \`
                    <div class="calendar-meal-chip \${slot}" onclick="openMealDetails('\${dateStr}', '\${slot}')">
                        \${m.name}
                    </div>
                \`).join('') : ''}
            </div>
        \`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ============================================================
// PROFILE
// ============================================================

function renderProfile() {
    const data = appState.user;
    const container = document.getElementById('profile-data');
    
    container.innerHTML = \`
        <div class="profile-grid">
            <div class="profile-edit-card"><div class="label">Altezza</div><div class="value">\${data.height} cm</div></div>
            <div class="profile-edit-card"><div class="label">Peso</div><div class="value">\${data.weight} kg</div></div>
            <div class="profile-edit-card"><div class="label">Età</div><div class="value">\${data.age} anni</div></div>
            <div class="profile-edit-card"><div class="label">Obiettivo</div><div class="value">\${data.goal.toUpperCase()}</div></div>
            <div class="profile-edit-card"><div class="label">Dieta</div><div class="value">\${data.diet_type.toUpperCase()}</div></div>
            <div class="profile-edit-card"><div class="label">Pasti</div><div class="value">\${data.eating_pattern.toUpperCase()}</div></div>
        </div>
        <div class="glass-panel" style="margin-top: 1rem; border-color: rgba(16, 185, 129, 0.2);">
            <h4 style="margin-bottom: 0.5rem; color: var(--accent-primary);">Statistiche</h4>
            <p>Fabbisogno Giornaliero: <strong>\${data.targetCalories} kcal</strong></p>
            <p>BMI: <strong>\${calculateBMI(data.weight, data.height).bmi}</strong> (\${calculateBMI(data.weight, data.height).category})</p>
        </div>
    \`;
}

async function regeneratePlan() {
    if (!confirm("Vuoi rigenerare il piano per la prossima settimana? Le modifiche manuali andranno perse.")) return;
    showLoader();
    appState.plan = generateMonthlyPlan(appState.user);
    await saveToCloud();
    showView('dashboard');
    hideLoader();
}

async function resetProfile() {
    if (!confirm("Attenzione: questo cancellerà tutti i tuoi dati e dovrai rifare l'onboarding. Continuare?")) return;
    showLoader();
    await _supabase.from('profiles').delete().eq('id', currentUser.id);
    appState.user = null;
    appState.plan = [];
    showView('onboarding');
    hideLoader();
}

// ============================================================
// SHOPPING LIST
// ============================================================

function renderShoppingDaySelector() {
    const container = document.getElementById('shopping-days-selector');
    const today = getTodayISO();
    const futureDays = appState.plan.filter(p => p.date >= today).slice(0, 14);

    container.innerHTML = futureDays.map(day => {
        const d = new Date(day.date);
        const label = d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        return \`
            <label style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; border-radius: 50px; cursor: pointer;">
                <input type="checkbox" class="shopping-day-cb" value="\${day.date}" checked>
                <span>\${label}</span>
            </label>
        \`;
    }).join('');
}

function renderShoppingList(forceGenerate = true) {
    const container = document.getElementById('shopping-list-content');
    if (!appState.plan || appState.plan.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Nessun piano attivo.</p>';
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
                const key = \`\${ing.name.toLowerCase()}-\${ing.unit}\`;
                if (!items[key]) items[key] = { name: ing.name, amount: 0, unit: ing.unit };
                const amt = parseFloat(ing.amount);
                if (!isNaN(amt)) items[key].amount += (amt * portion);
            });
            if (meal.smartAddition) {
                const sa = meal.smartAddition;
                const key = \`\${sa.name.toLowerCase()}-\${sa.unit}\`;
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

    let html = sortedCats.map(cat => \`
        <div style="margin-bottom: 2rem;">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 1rem; letter-spacing: 0.05em; border-left: 3px solid var(--accent-primary); padding-left: 0.75rem;">\${cat.toUpperCase()}</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;">
                \${grouped[cat].map(item => \`
                    <label style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 12px; padding: 0.75rem 1rem; cursor: pointer; transition: all 0.2s;">
                        <span style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
                            <input type="checkbox" class="ingredient-checkbox" style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 0.95rem; font-weight: 500; line-height: 1.2; color: var(--text-primary);">\${item.name}</span>
                        </span>
                        <span style="font-weight: 700; color: var(--accent-primary); white-space: nowrap; font-size: 0.9rem; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;">\${Math.round(item.amount)} \${item.unit}</span>
                    </label>
                \`).join('')}
            </div>
        </div>
    \`).join('');

    container.innerHTML = html || '<p class="text-center text-muted">Nessun ingrediente trovato per i giorni selezionati.</p>';
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
