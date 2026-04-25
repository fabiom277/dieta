// --- ADMIN LOGIC ---

let allRecipes = [];
let currentEditingId = null;

// ============================================================
// AUTH
// ============================================================

async function checkAdminAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    
    if (session && session.user) {
        document.getElementById('admin-auth-view').classList.add('hidden');
        document.getElementById('admin-content-view').classList.remove('hidden');
        loadAllRecipes();
    } else {
        document.getElementById('admin-auth-view').classList.remove('hidden');
        document.getElementById('admin-content-view').classList.add('hidden');
    }
}

async function handleAdminLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-auth-error');
    
    if (errorEl) errorEl.style.display = 'none';

    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        if (errorEl) {
            errorEl.textContent = "Errore: " + error.message;
            errorEl.style.display = 'block';
        }
    } else {
        checkAdminAuth();
    }
}

// ============================================================
// DATA OPERATIONS
// ============================================================

async function loadAllRecipes() {
    const { data, error } = await _supabase
        .from('recipes')
        .select('*')
        .order('name');

    if (error) {
        console.error("Errore nel caricamento ricette:", error);
        return;
    }

    allRecipes = data;
    renderRecipeList(allRecipes);
    const countEl = document.getElementById('recipe-count');
    if (countEl) countEl.textContent = `${allRecipes.length} ricette nel database`;
}

function renderRecipeList(recipes) {
    const list = document.getElementById('recipe-list');
    if (!list) return;
    list.innerHTML = '';

    recipes.forEach(r => {
        const card = document.createElement('div');
        card.className = 'recipe-card-admin';
        card.innerHTML = `
            <img src="${r.image_url || 'https://via.placeholder.com/300x150?text=No+Image'}" alt="${r.name}">
            <div class="recipe-info">
                <span class="text-muted" style="font-size: 0.7rem; text-transform: uppercase;">${r.type}</span>
                <h3>${r.name}</h3>
                <p class="text-muted" style="font-size: 0.8rem;">${r.base_calories} kcal</p>
            </div>
            <div class="recipe-actions">
                <button class="btn-small" onclick="openEditor('${r.id}')">Modifica</button>
                <a href="${r.source_url}" target="_blank" class="btn-small" style="text-decoration:none; text-align:center;">Vedi Fonte</a>
            </div>
        `;
        list.appendChild(card);
    });
}

function filterRecipes() {
    const query = document.getElementById('recipe-search').value.toLowerCase();
    const type = document.getElementById('filter-type').value;

    const filtered = allRecipes.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(query) || 
                            JSON.stringify(r.ingredients).toLowerCase().includes(query);
        const matchesType = type === 'all' || r.type === type;
        return matchesSearch && matchesType;
    });

    renderRecipeList(filtered);
}

// ============================================================
// EDITOR
// ============================================================

function openEditor(id = null) {
    currentEditingId = id;
    const modal = document.getElementById('editor-modal');
    const form = document.getElementById('recipe-editor-form');
    const title = document.getElementById('editor-title');
    const deleteBtn = document.getElementById('btn-delete-recipe');

    if (id) {
        const r = allRecipes.find(recipe => String(recipe.id) === String(id));
        if (title) title.textContent = "Modifica Ricetta";
        if (deleteBtn) deleteBtn.style.display = 'block';
        
        document.getElementById('edit-id').value = r.id;
        document.getElementById('edit-name').value = r.name;
        document.getElementById('edit-type').value = r.type;
        document.getElementById('edit-calories').value = r.base_calories;
        document.getElementById('edit-image-url').value = r.image_url || '';
        document.getElementById('edit-source-url').value = r.source_url || '';
        document.getElementById('edit-ingredients').value = JSON.stringify(r.ingredients, null, 2);
        document.getElementById('edit-instructions').value = JSON.stringify(r.instructions, null, 2);
        document.getElementById('edit-macros').value = JSON.stringify(r.macros);
    } else {
        if (title) title.textContent = "Aggiungi Nuova Ricetta";
        if (deleteBtn) deleteBtn.style.display = 'none';
        if (form) form.reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('edit-ingredients').value = '[\n  {\n    "name": "",\n    "amount": 0,\n    "unit": "g",\n    "category": ""\n  }\n]';
        document.getElementById('edit-instructions').value = '[\n  "Fase 1",\n  "Fase 2"\n]';
        document.getElementById('edit-macros').value = '{"protein": 0, "carbs": 0, "fat": 0}';
    }

    if (modal) modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeEditor() {
    const modal = document.getElementById('editor-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = '';
}

async function handleEditorSubmit(e) {
    if (e) e.preventDefault();
    
    try {
        const id = document.getElementById('edit-id').value;
        const payload = {
            name: document.getElementById('edit-name').value,
            type: document.getElementById('edit-type').value,
            base_calories: parseInt(document.getElementById('edit-calories').value),
            image_url: document.getElementById('edit-image-url').value,
            source_url: document.getElementById('edit-source-url').value,
            ingredients: JSON.parse(document.getElementById('edit-ingredients').value),
            instructions: JSON.parse(document.getElementById('edit-instructions').value),
            macros: JSON.parse(document.getElementById('edit-macros').value)
        };

        if (id) {
            await _supabase.from('recipes').update(payload).eq('id', id);
        } else {
            await _supabase.from('recipes').insert([payload]);
        }

        alert("Salvataggio completato!");
        closeEditor();
        loadAllRecipes();
    } catch (err) {
        alert("Errore nel salvataggio: " + err.message);
    }
}

async function deleteRecipe() {
    if (!currentEditingId) return;
    if (!confirm("Sei sicuro di voler eliminare questa ricetta?")) return;

    const { error } = await _supabase
        .from('recipes')
        .delete()
        .eq('id', currentEditingId);

    if (error) {
        alert("Errore nell'eliminazione: " + error.message);
    } else {
        alert("Ricetta eliminata.");
        closeEditor();
        loadAllRecipes();
    }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAuth();

    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) loginForm.addEventListener('submit', handleAdminLogin);
    
    const btnLogout = document.getElementById('btn-logout-admin');
    if (btnLogout) btnLogout.addEventListener('click', async () => {
        await _supabase.auth.signOut();
        checkAdminAuth();
    });

    const searchInput = document.getElementById('recipe-search');
    if (searchInput) searchInput.addEventListener('input', filterRecipes);
    
    const typeFilter = document.getElementById('filter-type');
    if (typeFilter) typeFilter.addEventListener('change', filterRecipes);
    
    const btnAdd = document.getElementById('btn-add-recipe');
    if (btnAdd) btnAdd.addEventListener('click', () => openEditor());
    
    const btnClose = document.getElementById('btn-close-editor');
    if (btnClose) btnClose.addEventListener('click', closeEditor);
    
    const editorForm = document.getElementById('recipe-editor-form');
    if (editorForm) editorForm.addEventListener('submit', handleEditorSubmit);
    
    const btnDel = document.getElementById('btn-delete-recipe');
    if (btnDel) btnDel.addEventListener('click', deleteRecipe);
});

// Esposizione globale per HTML onclick
window.openEditor = openEditor;
window.closeEditor = closeEditor;
window.deleteRecipe = deleteRecipe;
window.handleAdminLogin = handleAdminLogin;
