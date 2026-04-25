// --- DATABASE RICETTE REALI ---
// Fonte: GialloZafferano.it (verificato aprile 2025)
// URL, ingredienti e passaggi trascritti direttamente dalle pagine originali.

const recipesDB = [

    // ============================
    // === COLAZIONI ===
    // ============================
    {
        id: 'b1',
        name: 'Avocado Toast con Salmone e Uovo in Camicia',
        type: 'breakfast',
        baseCalories: 304,
        macros: { protein: 15, carbs: 21, fat: 19 },
        ingredients: [
            { name: 'Pane casereccio', amount: 4, unit: 'fette', category: 'Panetteria' },
            { name: 'Salmone affumicato', amount: 100, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Avocado maturo', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Uova', amount: 4, unit: 'pz', category: 'Latticini' },
            { name: 'Succo di limone', amount: 1, unit: 'cucchiaio', category: 'Ortofrutta' },
            { name: 'Aceto di vino bianco', amount: 1, unit: 'cucchiaio', category: 'Dispensa' },
            { name: 'Timo fresco', amount: 4, unit: 'rametti', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 2, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Dividete l\'avocado a metà, rimuovete il nocciolo e prelevate la polpa. Trasferitela in una ciotola con il succo di limone e schiacciatela con una forchetta fino ad ottenere una crema. Regolate di sale e pepe, coprite e mettete in frigo.',
            'Scaldate un filo d\'olio in una padella e tostate le fette di pane da entrambi i lati finché non sono dorate. Tenete da parte.',
            'Portate a bollore un pentolino d\'acqua con l\'aceto. Abbassate la fiamma, create un vortice con un cucchiaio e fate scivolare delicatamente un uovo sgusciato al centro. Cuocete 3-4 minuti senza toccare. Scolate con una schiumarola. Ripetete per le altre uova.',
            'Spalmate la crema di avocado sulle fette di pane tostato. Aggiungete una fetta di salmone affumicato su ciascuna.',
            'Adagiate l\'uovo in camicia sopra il salmone, facendo attenzione a non romperlo. Guarnite con fogliolina di timo, un filo d\'olio e scorza grattugiata di limone. Servite subito.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Avocado-toast.html',
        imageUrl: 'https://www.giallozafferano.it/images/191/Avocado-toast_400x300.jpg'
    },
    {
        id: 'b2',
        name: 'Porridge di Avena con Fragole e Cioccolato',
        type: 'breakfast',
        baseCalories: 320,
        macros: { protein: 10, carbs: 52, fat: 8 },
        ingredients: [
            { name: 'Fiocchi d\'avena extra-fine', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Latte intero', amount: 200, unit: 'ml', category: 'Latticini' },
            { name: 'Acqua', amount: 200, unit: 'ml', category: 'Dispensa' },
            { name: 'Miele millefiori', amount: 2, unit: 'cucchiai', category: 'Dispensa' },
            { name: 'Sale fino', amount: 1, unit: 'pizzico', category: 'Dispensa' },
            { name: 'Yogurt bianco naturale', amount: 4, unit: 'cucchiai', category: 'Latticini' },
            { name: 'Fragole', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Cioccolato fondente', amount: 40, unit: 'g', category: 'Dispensa' }
        ],
        instructions: [
            'Versate i fiocchi d\'avena in un pentolino insieme all\'acqua e al latte.',
            'Aggiungete il sale e il miele, poi cuocete a fuoco dolce per 2-3 minuti, mescolando con un cucchiaio. Dovrete ottenere una consistenza morbida, non collosa.',
            'Nel frattempo lavate e tagliate le fragole. Grattugiate o fate scaglie di cioccolato fondente.',
            'Versate il porridge nelle ciotole e guarnite con lo yogurt e le fragole.',
            'Arricchite con le scaglie di cioccolato fondente e, se volete, un altro filo di miele. Servite subito caldo.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Porridge.html',
        imageUrl: 'https://www.giallozafferano.it/images/164/Porridge_400x300.jpg'
    },
    {
        id: 'b3',
        name: 'Plumcake allo Yogurt (Iginio Massari)',
        type: 'breakfast',
        baseCalories: 277,
        macros: { protein: 6, carbs: 33, fat: 14 },
        ingredients: [
            { name: 'Farina 00', amount: 250, unit: 'g', category: 'Dispensa' },
            { name: 'Uova', amount: 4, unit: 'pz', category: 'Latticini' },
            { name: 'Burro morbido', amount: 200, unit: 'g', category: 'Latticini' },
            { name: 'Zucchero a velo', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Yogurt greco', amount: 200, unit: 'g', category: 'Latticini' },
            { name: 'Fecola di patate', amount: 50, unit: 'g', category: 'Dispensa' },
            { name: 'Lievito per dolci', amount: 16, unit: 'g', category: 'Dispensa' },
            { name: 'Baccello di vaniglia', amount: 1, unit: 'pz', category: 'Dispensa' }
        ],
        instructions: [
            'Assicuratevi che tutti gli ingredienti siano a temperatura ambiente (circa 24°). Imburrate e infarinate due stampi da plumcake 16x8 cm.',
            'Inserite nel mixer i semi del baccello di vaniglia, il burro a cubetti, la farina, le uova, lo yogurt greco, lo zucchero a velo, il sale, il lievito e la fecola.',
            'Lavorate alla massima velocità per circa 3 minuti e mezzo fino ad ottenere un composto omogeneo e vellutato.',
            'Trasferite l\'impasto negli stampi. Immergete la lama di un coltello nel burro fuso e fate una tacca al centro di ogni plumcake: questo garantirà una crescita uniforme in cottura.',
            'Cuocete in forno statico preriscaldato: prima a 185°C per 15 minuti, poi a 165°C per 30 minuti. Fate la prova stecchino, sformate e lasciate raffreddare completamente prima di servire.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Plumcake-allo-yogurt.html',
        imageUrl: 'https://www.giallozafferano.it/images/260/Plumcake-allo-yogurt_400x300.jpg'
    },

    // ============================
    // === PRANZI / CENE ===
    // ============================
    {
        id: 'l1',
        name: 'Spaghetti alle Vongole',
        type: 'lunch',
        baseCalories: 563,
        macros: { protein: 48, carbs: 71, fat: 9 },
        ingredients: [
            { name: 'Spaghetti', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Vongole veraci', amount: 1000, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Aglio', amount: 2, unit: 'spicchi', category: 'Ortofrutta' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 4, unit: 'cucchiai', category: 'Dispensa' },
            { name: 'Sale grosso (per ammollo)', amount: 2, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Battete le vongole sul lavandino per verificare che non ci sia sabbia all\'interno. Mettetele in una ciotola con acqua fredda e sale grosso, lasciate in ammollo 2-3 ore cambiando l\'acqua un paio di volte. Sciacquate bene.',
            'In un tegame scaldate l\'olio con l\'aglio e i gambi del prezzemolo. Tuffate le vongole, chiudete con un coperchio e cuocete a fiamma alta agitando il tegame finché non si aprono. Togliete le vongole aperte e filtrate il fondo di cottura eliminando l\'aglio.',
            'Cuocete gli spaghetti in acqua poco salata per metà del tempo indicato. Nel frattempo rimettete il fondo filtrato nel tegame.',
            'Scolate la pasta e trasferitela nel tegame con il sugo. Aggiungete un mestolo di acqua di cottura e terminate la cottura risottando, aggiungendo acqua al bisogno.',
            'Quando la pasta è pronta, aggiungete le vongole, regolate di pepe e unite abbondante prezzemolo tritato. Saltate brevemente e servite subito.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Spaghetti-alle-vongole.html',
        imageUrl: 'https://www.giallozafferano.it/images/178/Spaghetti-alle-vongole_400x300.jpg'
    },
    {
        id: 'l2',
        name: 'Pollo Arrosto alle Erbe Aromatiche',
        type: 'lunch',
        baseCalories: 580,
        macros: { protein: 47, carbs: 2, fat: 42 },
        ingredients: [
            { name: 'Pollo intero', amount: 1200, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Sale grosso', amount: 12, unit: 'g', category: 'Dispensa' },
            { name: 'Aglio', amount: 2, unit: 'spicchi', category: 'Ortofrutta' },
            { name: 'Rosmarino fresco', amount: 2, unit: 'rametti', category: 'Ortofrutta' },
            { name: 'Salvia fresca', amount: 4, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Alloro', amount: 2, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Origano fresco', amount: 1, unit: 'cucchiaino', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Legate il pollo con un elastico da cucina passandolo intorno alle coscette e dietro il petto per mantenere la forma in cottura.',
            'Nel mixer frullate il sale grosso, l\'alloro, il rosmarino, la salvia, l\'origano e i 2 spicchi d\'aglio pelati fino ad ottenere un trito aromatico.',
            'Spennellate il pollo con l\'olio extravergine su tutti i lati. Ricoprite interamente con il trito aromatico massaggiandolo con le mani, condendo anche l\'interno del pollo.',
            'Sistemate il pollo in una pirofila e cuocete in forno statico preriscaldato a 180°C per circa un\'ora, nappando di tanto in tanto con il fondo di cottura. A metà cottura giratelo dall\'altra parte.',
            'Per verificare la cottura, misurate la temperatura al centro della coscetta: deve raggiungere i 72°C. Sfornate e servite caldo.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pollo-arrosto.html',
        imageUrl: 'https://www.giallozafferano.it/images/250/Pollo-arrosto_400x300.jpg'
    },
    {
        id: 'l3',
        name: 'Insalata di Riso Classica',
        type: 'lunch',
        baseCalories: 647,
        macros: { protein: 36, carbs: 73, fat: 23 },
        ingredients: [
            { name: 'Riso Arborio', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Tonno sott\'olio', amount: 160, unit: 'g', category: 'Dispensa' },
            { name: 'Prosciutto cotto', amount: 100, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Scamorza (provola)', amount: 100, unit: 'g', category: 'Latticini' },
            { name: 'Pisellini', amount: 100, unit: 'g', category: 'Ortofrutta' },
            { name: 'Peperoni rossi e gialli', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Pomodorini datterini', amount: 100, unit: 'g', category: 'Ortofrutta' },
            { name: 'Olive nere denocciolate', amount: 60, unit: 'g', category: 'Dispensa' },
            { name: 'Basilico fresco', amount: 8, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 2, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Portate a bollore acqua leggermente salata e sbollentate i piselli per un minuto. Scolate in acqua e ghiaccio e trasferite in una ciotola capiente.',
            'Versate il riso nella stessa acqua dei piselli e cuocete per 14-15 minuti. Scolate, distribuite su una teglia, condite con un filo d\'olio e lasciate raffreddare completamente.',
            'Tagliate a dadini di 1 cm i peperoni (eliminando semi e filamenti), la scamorza, il prosciutto e i pomodorini in quarti. Spezzettate le olive.',
            'Nella ciotola con i piselli unite il peperone, la scamorza, il prosciutto, i pomodorini, le olive, il tonno sbriciolato e le foglie di basilico.',
            'Aggiungete il riso freddo, amalgamate bene, insaporite con sale e un filo d\'olio. Conservate in frigo e servite fresca.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Insalata-di-riso-classica.html',
        imageUrl: 'https://www.giallozafferano.it/images/213/Insalata-di-riso-classica_400x300.jpg'
    },
    {
        id: 'l4',
        name: 'Bruschette al Pomodoro',
        type: 'lunch',
        baseCalories: 206,
        macros: { protein: 7, carbs: 33, fat: 5 },
        ingredients: [
            { name: 'Pane casereccio', amount: 300, unit: 'g', category: 'Panetteria' },
            { name: 'Pomodori ramati', amount: 400, unit: 'g', category: 'Ortofrutta' },
            { name: 'Basilico fresco', amount: 8, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Origano', amount: 1, unit: 'cucchiaino', category: 'Dispensa' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Lavate i pomodori, tagliateli a metà e poi a cubetti. Versate in una ciotola con le foglie di basilico lavate, un pizzico di origano, sale, pepe e olio. Mescolate e lasciate insaporire 30 minuti.',
            'Tagliate il pane a fette. Scaldate bene una griglia e grigliate le fette da entrambi i lati finché non sono ben abbrustolite.',
            'Opzionale: strofinate mezzo spicchio d\'aglio sulle fette di pane caldo appena tolte dalla griglia.',
            'Distribuite l\'insalata di pomodori sulle fette di pane, condite con un filo d\'olio.',
            'Fate riposare due minuti per far insaporire il pane con il sughetto dei pomodori, poi servite subito.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Bruschette-al-pomodoro.html',
        imageUrl: 'https://www.giallozafferano.it/images/268/Bruschette-al-pomodoro_400x300.jpg'
    },
    {
        id: 'l5',
        name: 'Salmone al Forno con Verdure',
        type: 'lunch',
        baseCalories: 480,
        macros: { protein: 35, carbs: 10, fat: 32 },
        ingredients: [
            { name: 'Filetto di salmone', amount: 600, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Zucchine', amount: 250, unit: 'g', category: 'Ortofrutta' },
            { name: 'Limone', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Lavate le zucchine e tagliatele a rondelle sottili. Disponetele su una teglia con carta forno e conditele con sale, pepe e olio.',
            'Adagiate i filetti di salmone sopra le zucchine.',
            'Condite il salmone con fettine di limone, prezzemolo tritato, sale e un filo d\'olio extravergine.',
            'Infornate a 190°C (forno ventilato) per circa 15-18 minuti, a seconda dello spessore del filetto.',
            'Sfornate e servite caldo, accompagnato dalle zucchine morbide.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Salmone-al-forno.html',
        imageUrl: 'https://www.giallozafferano.it/images/170/Salmone-al-forno_400x300.jpg'
    },

    // ============================
    // === SPUNTINI ===
    // ============================
    {
        id: 's1',
        name: 'Hummus di Ceci con Verdure Crude',
        type: 'snack',
        baseCalories: 210,
        macros: { protein: 8, carbs: 22, fat: 10 },
        ingredients: [
            { name: 'Ceci precotti', amount: 240, unit: 'g', category: 'Dispensa' },
            { name: 'Crema di sesamo (Tahina)', amount: 30, unit: 'g', category: 'Dispensa' },
            { name: 'Succo di limone', amount: 2, unit: 'cucchiai', category: 'Ortofrutta' },
            { name: 'Aglio', amount: 1, unit: 'spicchio', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 2, unit: 'cucchiai', category: 'Dispensa' },
            { name: 'Carote', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Sedano', amount: 2, unit: 'coste', category: 'Ortofrutta' }
        ],
        instructions: [
            'Scolate e sciacquate i ceci. Tenetene qualcuno da parte per guarnire.',
            'Nel frullatore mettete i ceci, la tahina, il succo di limone, lo spicchio d\'aglio e un pizzico di sale. Frullate aggiungendo gradualmente 2-3 cucchiai di acqua fredda fino ad ottenere una crema liscia e vellutata.',
            'Assaggiate e regolate di sale e limone. Se troppo denso, aggiungete ancora un po\' d\'acqua.',
            'Pelate le carote e tagliatele a bastoncini. Tagliate anche il sedano a bastoncini.',
            'Servite l\'hummus in una ciotola con un filo d\'olio e i ceci tenuti da parte, accompagnato dai bastoncini di verdure crude per intingere.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Hummus-di-ceci.html',
        imageUrl: 'https://www.giallozafferano.it/images/190/Hummus-di-ceci_400x300.jpg'
    },
    {
        id: 's2',
        name: 'Bruschetta Caprese (Snack)',
        type: 'snack',
        baseCalories: 220,
        macros: { protein: 9, carbs: 20, fat: 11 },
        ingredients: [
            { name: 'Pane casereccio', amount: 2, unit: 'fette', category: 'Panetteria' },
            { name: 'Pomodorini', amount: 100, unit: 'g', category: 'Ortofrutta' },
            { name: 'Mozzarella fiordilatte', amount: 50, unit: 'g', category: 'Latticini' },
            { name: 'Basilico fresco', amount: 4, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 1, unit: 'cucchiaio', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate i pomodorini a metà e la mozzarella a cubetti piccoli. Raccoglieteli in una ciotola con sale, olio e basilico spezzettato. Lasciate riposare 10 minuti.',
            'Tostate le fette di pane su una griglia o nel tostapane.',
            'Disponete il condimento sulle fette di pane tostate e servite subito.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Bruschetta-caprese.html',
        imageUrl: 'https://www.giallozafferano.it/images/162/Bruschetta-caprese_400x300.jpg'
    }
];

// Filtri per tipo
const breakfastsDB = recipesDB.filter(r => r.type === 'breakfast');
const lunchesDB    = recipesDB.filter(r => r.type === 'lunch');
const snacksDB     = recipesDB.filter(r => r.type === 'snack');
