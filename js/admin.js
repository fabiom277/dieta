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
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-auth-error');
    
    errorEl.style.display = 'none';

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        errorEl.textContent = "Errore: " + error.message;
        errorEl.style.display = 'block';
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
    document.getElementById('recipe-count').textContent = `${allRecipes.length} ricette nel database`;
}

function renderRecipeList(recipes) {
    const list = document.getElementById('recipe-list');
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
                <button class="btn-small" onclick="openEditor(${r.id})">Modifica</button>
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
        const r = allRecipes.find(recipe => recipe.id === id);
        title.textContent = "Modifica Ricetta";
        deleteBtn.style.display = 'block';
        
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
        title.textContent = "Aggiungi Nuova Ricetta";
        deleteBtn.style.display = 'none';
        form.reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('edit-ingredients').value = '[\n  {\n    "name": "",\n    "amount": 0,\n    "unit": "g",\n    "category": ""\n  }\n]';
        document.getElementById('edit-instructions').value = '[\n  "Fase 1",\n  "Fase 2"\n]';
        document.getElementById('edit-macros').value = '{"protein": 0, "carbs": 0, "fat": 0}';
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeEditor() {
    document.getElementById('editor-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

async function handleEditorSubmit(e) {
    e.preventDefault();
    
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

        let result;
        if (id) {
            result = await _supabase.from('recipes').update(payload).eq('id', id);
        } else {
            result = await _supabase.from('recipes').insert([payload]);
        }

        if (result.error) throw result.error;

        alert("Salvataggio completato!");
        closeEditor();
        loadAllRecipes();
    } catch (err) {
        alert("Errore nel salvataggio: " + err.message);
    }
}

async function deleteRecipe() {
    if (!currentEditingId) return;
    if (!confirm("Sei sicuro di voler eliminare questa ricetta? L'azione è irreversibile.")) return;

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

    document.getElementById('admin-login-form').addEventListener('submit', handleAdminLogin);
    document.getElementById('btn-logout-admin').addEventListener('click', async () => {
        await _supabase.auth.signOut();
        checkAdminAuth();
    });

    document.getElementById('recipe-search').addEventListener('input', filterRecipes);
    document.getElementById('filter-type').addEventListener('change', filterRecipes);
    document.getElementById('btn-add-recipe').addEventListener('click', () => openEditor());
    document.getElementById('btn-close-editor').addEventListener('click', closeEditor);
    document.getElementById('recipe-editor-form').addEventListener('submit', handleEditorSubmit);
    document.getElementById('btn-delete-recipe').addEventListener('click', deleteRecipe);
});
