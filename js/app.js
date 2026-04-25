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

    const confirmedMeals = visiblePlan.reduce((acc, day) => acc + Object.values(day.meals).filter(m => m.confirmed).length, 0);
    const totalPotentialMeals = visiblePlan.length * 4; 
    const weeklyProgress = (confirmedMeals / totalPotentialMeals) * 100;

    let html = `
        <div class="dashboard-header" style="margin-bottom: 3rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 2rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 style="font-size: 2.5rem; margin-bottom: 0.5rem; letter-spacing: -0.03em;">Il Tuo Piano <span class="highlight">Settimanale</span></h1>
                    <p class="text-muted" style="font-size: 1.1rem;">Settimana del ${new Date(visiblePlan[0].date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</p>
                </div>
                <div style="text-align: right; min-width: 200px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">Obiettivo Settimanale: ${confirmedMeals}/${totalPotentialMeals} Pasti</div>
                    <div class="progress-container" style="margin: 0;">
                        <div class="progress-fill" style="width: ${weeklyProgress}%"></div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1.5rem; margin-top: 2rem; align-items: center; flex-wrap: wrap;">
                <div style="background: rgba(16, 185, 129, 0.1); padding: 0.6rem 1.2rem; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); font-weight: 700; color: var(--accent-primary); display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">🎯</span> \${appState.user.targetCalories} kcal / giorno
                </div>
                <div style="background: rgba(255, 255, 255, 0.05); padding: 0.6rem 1.2rem; border-radius: 12px; border: 1px solid var(--glass-border); font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 1.2rem;">🥗</span> Dieta: \${appState.user.diet_type || 'Standard'}
                </div>
            </div>
        </div>
    `;

    html += \`<div class="calendar-grid" style="display: flex; flex-direction: column; gap: 2.5rem;">\`;

    visiblePlan.forEach(day => {
        let totalCals = 0;
        Object.values(day.meals).forEach(m => totalCals += (m.calories || 0));
        const isToday = day.date === today;

        html += \`
            <div class="day-section" style="\${isToday ? 'background: rgba(16, 185, 129, 0.03); border-radius: 20px; padding: 1.5rem; border: 1px solid rgba(16, 185, 129, 0.1);' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <h2 style="text-transform:capitalize; font-size: 1.5rem; display: flex; align-items: center; gap: 0.75rem;">
                        \${isToday ? '<span style="background: var(--accent-primary); color: #fff; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; vertical-align: middle;">OGGI</span>' : ''}
                        \${new Date(day.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </h2>
                    <span style="font-weight:800; font-size: 1.2rem; color: var(--text-secondary); opacity: 0.8;">\${Math.round(totalCals)} <span style="font-size: 0.8rem; font-weight: 500;">kcal totali</span></span>
                </div>
                <div class="meals-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.25rem;">
                    \${renderMealSlot(day.date, 'breakfast', day.meals.breakfast)}
                    \${renderMealSlot(day.date, 'snack', day.meals.snack)}
                    \${renderMealSlot(day.date, 'lunch', day.meals.lunch)}
                    \${renderMealSlot(day.date, 'dinner', day.meals.dinner)}
                </div>
            </div>
        \`;
    });

    html += \`</div>\`;
    container.innerHTML = html;
}

function renderMealSlot(date, type, meal) {
    if (!meal) return '';
    const labels = { breakfast: 'Colazione', snack: 'Spuntino', lunch: 'Pranzo', dinner: 'Cena' };
    
    return \`
        <div class="meal-card" onclick="openMealDetails('\${date}', '\${type}')" style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 1.5rem; border-radius: 16px; transition: all 0.2s ease; position: relative; overflow: hidden;">
            <div class="meal-tag" style="font-size: 0.7rem; color: var(--accent-primary); font-weight: 800; margin-bottom: 0.75rem; letter-spacing: 0.05em;">\${labels[type].toUpperCase()}</div>
            <h3 style="margin-bottom:0.75rem; font-size:1.15rem; line-height: 1.3; font-weight: 700;">\${meal.name}</h3>
            
            \${meal.smartAddition ? \`<div class="smart-addition-tag" style="background: rgba(59, 130, 246, 0.1); color: #60a5fa; font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; margin-bottom: 1rem; border: 1px solid rgba(59, 130, 246, 0.1);">+ \${meal.smartAddition.amount}\${meal.smartAddition.unit} \${meal.smartAddition.name}</div>\` : ''}
            
            <div style="display:flex; gap:1.25rem; margin-top:auto; font-size:0.85rem; font-weight: 600; color: var(--text-secondary);">
                <span>🔥 \${Math.round(meal.calories)} <span style="font-size: 0.7rem; opacity: 0.7;">kcal</span></span>
                <span>🥩 \${Math.round(meal.macros.protein * (meal.portion || 1))}g <span style="font-size: 0.7rem; opacity: 0.7;">pro</span></span>
            </div>

            <div style="display:flex; gap:0.5rem; margin-top:1.25rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <button class="btn-swap" style="flex: 1; background: \${meal.confirmed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)'}; color: \${meal.confirmed ? 'var(--accent-primary)' : 'var(--text-primary)'}; border: 1px solid \${meal.confirmed ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)'}; padding: 0.5rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer;" onclick="event.stopPropagation(); confirmMeal('\${date}', '\${type}')">
                    \${meal.confirmed ? '✓ Confermata' : 'Conferma'}
                </button>
                <button class="btn-swap" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); border: 1px solid var(--glass-border); padding: 0.5rem 0.75rem; border-radius: 8px; font-size: 0.8rem; cursor: pointer;" onclick="event.stopPropagation(); swapMeal('\${date}', '\${type}')">🔄</button>
            </div>
        </div>
    \`;
}

function openMealDetails(date, mealType) {
    const dayPlan = appState.plan.find(p => p.date === date);
    const meal    = dayPlan.meals[mealType];
    const labels  = { breakfast: 'Colazione', lunch: 'Pranzo', snack: 'Spuntino', dinner: 'Cena' };
    const portion = meal.portion || 1.0;

    let html = '';
    if (meal.imageUrl) html += \`<img src="\${meal.imageUrl}" class="recipe-header-img" alt="\${meal.name}">\`;

    let additionHtml = '';
    if (meal.smartAddition) {
        additionHtml = \`
            <div style="background:rgba(16, 185, 129, 0.1); border-left:4px solid var(--accent-primary); padding:1rem; margin:1rem 0; border-radius:8px;">
                <h4 style="color:var(--accent-primary); margin-bottom:0.3rem;">💡 Integrazione Consigliata</h4>
                <p style="font-size:0.9rem;">Per raggiungere il tuo target, aggiungi: <strong>\${meal.smartAddition.amount}\${meal.smartAddition.unit} di \${meal.smartAddition.name}</strong>.</p>
            </div>
        \`;
    }

    html += \`<div class="recipe-body">
        <div class="meal-tag">\${labels[mealType]} \${portion > 1.05 ? \`(x\${portion.toFixed(1)})\` : ''}</div>
        <h2 style="font-size:2rem; margin-bottom:1rem;">\${meal.name}</h2>
        
        <div class="recipe-meta">
            <div class="meta-item"><span class="label">Calorie</span><span class="value">\${Math.round(meal.calories)}</span></div>
            <div class="meta-item"><span class="label">Prot</span><span class="value">\${Math.round(meal.macros.protein * portion)}g</span></div>
            <div class="meta-item"><span class="label">Carb</span><span class="value">\${Math.round(meal.macros.carbs * portion)}g</span></div>
            <div class="meta-item"><span class="label">Fat</span><span class="value">\${Math.round(meal.macros.fat * portion)}g</span></div>
        </div>

        \${additionHtml}

        <div class="recipe-section">
            <h4>Ingredienti</h4>
            <ul style="list-style:none;">
                \${meal.ingredients.map(i => {
                    const amt = isNaN(parseFloat(i.amount)) ? i.amount : (parseFloat(i.amount) * portion).toFixed(0);
                    return \`<li style="padding:0.5rem 0; border-bottom:1px solid var(--glass-border); display:flex; justify-content:space-between;">
                        <span>\${i.name}</span>
                        <span style="font-weight:700; color:var(--accent-primary);">\${amt} \${i.unit}</span>
                    </li>\`;
                }).join('')}
            </ul>
        </div>

        <div class="recipe-section">
            <h4>Preparazione</h4>
            <ol style="padding-left:1.2rem; line-height:1.6;">
                \${(meal.instructions && Array.isArray(meal.instructions)) 
                    ? meal.instructions.map(s => \`<li style="margin-bottom:0.8rem;">\${s}</li>\`).join('') 
                    : '<li style="color:var(--text-muted);">Passaggi non disponibili per questa ricetta.</li>'}
            </ol>
            
            \${(meal.instructions && meal.instructions.length > 0) ? \`
                <button class="btn btn-primary" style="width: 100%; margin-top: 1.5rem; padding: 1rem; font-size: 1rem;" onclick="startCookingSession('\${date}', '\${mealType}')">
                    👨‍🍳 Inizia Guida Passo-Passo
                </button>
            \` : ''}

            \${meal.sourceUrl ? \`<p style="margin-top:1.5rem; font-size:0.85rem;"><a href="\${meal.sourceUrl}" target="_blank" style="color:var(--accent-primary); text-decoration:none;">📖 Vedi ricetta originale su \${new URL(meal.sourceUrl).hostname}</a></p>\` : ''}
        </div>
    </div>\`;

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
        content.innerHTML = \`
            <div style="padding: 2rem; display: flex; flex-direction: column; min-height: 400px; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-primary); text-transform: uppercase;">Step \${currentStep + 1} di \${totalSteps}</span>
                        <div style="width: 60%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="width: \${progress}%; height: 100%; background: var(--accent-primary); transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    
                    <h2 style="font-size: 1.5rem; line-height: 1.4; margin-bottom: 2rem;">\${meal.instructions[currentStep]}</h2>
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                    <button class="btn btn-outline" style="flex: 1;" \${currentStep === 0 ? 'disabled' : ''} id="cooking-prev">⬅️ Indietro</button>
                    \${currentStep < totalSteps - 1 
                        ? \`<button class="btn btn-primary" style="flex: 2;" id="cooking-next">Avanti ➡️</button>\`
                        : \`<button class="btn btn-primary" style="flex: 2; background: #10b981;" id="cooking-finish">🏁 Fine e Conferma</button>\`
                    }
                </div>
            </div>
        \`;

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
