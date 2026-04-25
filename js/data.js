// --- DATABASE RICETTE REALI ---
// Fonte: GialloZafferano.it
// Immagini: Unsplash.com

const recipesDB = [

    // ============================
    // === COLAZIONI (10) ===
    // ============================
    {
        id: 'b1',
        name: 'Avocado Toast con Uovo in Camicia',
        type: 'breakfast',
        baseCalories: 304,
        macros: { protein: 15, carbs: 21, fat: 19 },
        ingredients: [
            { name: 'Pane casereccio', amount: 4, unit: 'fette', category: 'Panetteria' },
            { name: 'Salmone affumicato', amount: 100, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Avocado maturo', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Uova', amount: 4, unit: 'pz', category: 'Latticini' },
            { name: 'Succo di limone', amount: 1, unit: 'cucchiaio', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 2, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Dividete l\'avocado a metà, rimuovete il nocciolo e schiacciate la polpa con succo di limone, sale e pepe.',
            'Tostate le fette di pane in padella con un filo d\'olio fino a doratura.',
            'Portate a bollore acqua con un cucchiaio di aceto, create un vortice e fate scivolare le uova. Cuocete 3-4 minuti.',
            'Spalmate la crema di avocado sul pane, aggiungete il salmone e adagiate l\'uovo in camicia. Servite subito.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Avocado-toast.html',
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop'
    },
    {
        id: 'b2',
        name: 'Porridge con Fragole e Cioccolato',
        type: 'breakfast',
        baseCalories: 320,
        macros: { protein: 10, carbs: 52, fat: 8 },
        ingredients: [
            { name: 'Fiocchi d\'avena', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Latte intero', amount: 200, unit: 'ml', category: 'Latticini' },
            { name: 'Miele millefiori', amount: 2, unit: 'cucchiai', category: 'Dispensa' },
            { name: 'Fragole', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Cioccolato fondente', amount: 40, unit: 'g', category: 'Dispensa' },
            { name: 'Yogurt bianco', amount: 4, unit: 'cucchiai', category: 'Latticini' }
        ],
        instructions: [
            'Versate i fiocchi d\'avena in un pentolino con 200 ml d\'acqua e il latte. Aggiungete un pizzico di sale e il miele.',
            'Cuocete a fuoco dolce per 2-3 minuti mescolando fino a ottenere una consisitenza morbida.',
            'Lavate e tagliate le fragole. Grattugiate il cioccolato fondente a scaglie.',
            'Versate il porridge nelle ciotole, guarnite con yogurt, fragole e scaglie di cioccolato. Servite caldo.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Porridge.html',
        imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45b0?w=600&auto=format&fit=crop'
    },
    {
        id: 'b3',
        name: 'Plumcake allo Yogurt',
        type: 'breakfast',
        baseCalories: 277,
        macros: { protein: 6, carbs: 33, fat: 14 },
        ingredients: [
            { name: 'Farina 00', amount: 250, unit: 'g', category: 'Dispensa' },
            { name: 'Uova', amount: 4, unit: 'pz', category: 'Latticini' },
            { name: 'Burro morbido', amount: 200, unit: 'g', category: 'Latticini' },
            { name: 'Zucchero a velo', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Yogurt greco', amount: 200, unit: 'g', category: 'Latticini' },
            { name: 'Lievito per dolci', amount: 16, unit: 'g', category: 'Dispensa' }
        ],
        instructions: [
            'Imburrate e infarinate due stampi da plumcake. Preriscaldate il forno statico a 185°C.',
            'Nel mixer unite burro, farina, uova, yogurt, zucchero a velo, lievito e semi di vaniglia. Lavorate 3 minuti.',
            'Versate negli stampi, fate una tacca con un coltello imburrato al centro.',
            'Cuocete 15 min a 185°C, poi 30 min a 165°C. Fate la prova stecchino e lasciate raffreddare.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Plumcake-allo-yogurt.html',
        imageUrl: 'https://images.unsplash.com/photo-1486427944544-d2561f3e3a5b?w=600&auto=format&fit=crop'
    },
    {
        id: 'b4',
        name: 'Pancakes Americani',
        type: 'breakfast',
        baseCalories: 295,
        macros: { protein: 9, carbs: 38, fat: 12 },
        ingredients: [
            { name: 'Farina 00', amount: 250, unit: 'g', category: 'Dispensa' },
            { name: 'Uova', amount: 2, unit: 'pz', category: 'Latticini' },
            { name: 'Latte intero', amount: 300, unit: 'ml', category: 'Latticini' },
            { name: 'Burro fuso', amount: 50, unit: 'g', category: 'Latticini' },
            { name: 'Zucchero', amount: 50, unit: 'g', category: 'Dispensa' },
            { name: 'Lievito per dolci', amount: 16, unit: 'g', category: 'Dispensa' },
            { name: 'Sciroppo d\'acero', amount: 4, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Setacciate farina e lievito in una ciotola. In un\'altra sbattete uova, latte, zucchero e burro fuso.',
            'Unite i liquidi ai secchi mescolando fino a ottenere una pastella liscia. Lasciate riposare 10 minuti.',
            'Scaldate una padella antiaderente, versate un mestolino di pastella e cuocete finché si formano le bollicine. Girate e cuocete l\'altro lato.',
            'Impilateli e servite con sciroppo d\'acero e frutta fresca a piacere.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pancakes.html',
        imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&auto=format&fit=crop'
    },
    {
        id: 'b5',
        name: 'French Toast alla Cannella',
        type: 'breakfast',
        baseCalories: 310,
        macros: { protein: 11, carbs: 35, fat: 14 },
        ingredients: [
            { name: 'Pan brioche o pane in cassetta', amount: 8, unit: 'fette', category: 'Panetteria' },
            { name: 'Uova', amount: 3, unit: 'pz', category: 'Latticini' },
            { name: 'Latte intero', amount: 100, unit: 'ml', category: 'Latticini' },
            { name: 'Cannella in polvere', amount: 1, unit: 'cucchiaino', category: 'Dispensa' },
            { name: 'Burro', amount: 30, unit: 'g', category: 'Latticini' },
            { name: 'Zucchero a velo', amount: 2, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Sbattete le uova con il latte, la cannella e un pizzico di zucchero in un piatto fondo.',
            'Immergete le fette di pane nel composto, girandole per bagnarle bene da entrambi i lati.',
            'Sciogliete il burro in una padella e dorate le fette 2-3 minuti per lato a fuoco medio.',
            'Servite calde spolverizzate con zucchero a velo, miele o frutta fresca a piacere.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/French-toast.html',
        imageUrl: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=600&auto=format&fit=crop'
    },
    {
        id: 'b6',
        name: 'Crostata alla Marmellata',
        type: 'breakfast',
        baseCalories: 340,
        macros: { protein: 5, carbs: 48, fat: 15 },
        ingredients: [
            { name: 'Farina 00', amount: 300, unit: 'g', category: 'Dispensa' },
            { name: 'Burro freddo', amount: 150, unit: 'g', category: 'Latticini' },
            { name: 'Zucchero', amount: 120, unit: 'g', category: 'Dispensa' },
            { name: 'Uova', amount: 2, unit: 'pz', category: 'Latticini' },
            { name: 'Marmellata di albicocche', amount: 350, unit: 'g', category: 'Dispensa' },
            { name: 'Scorza di limone grattugiata', amount: 1, unit: 'pz', category: 'Ortofrutta' }
        ],
        instructions: [
            'Impastate farina, burro a pezzi, zucchero, uova e scorza di limone fino a ottenere un panetto liscio. Avvolgete in pellicola e riponete in frigo 30 minuti.',
            'Stendete 2/3 della pasta frolla nello stampo imburrato (diametro 24 cm). Bucherellate il fondo con una forchetta.',
            'Distribuite la marmellata uniformemente. Con la pasta restante ricavate le strisce per la decorazione a griglia.',
            'Cuocete in forno statico a 180°C per 30-35 minuti fino a doratura. Lasciate raffreddare prima di servire.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Crostata-di-marmellata.html',
        imageUrl: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b21?w=600&auto=format&fit=crop'
    },
    {
        id: 'b7',
        name: 'Muffin ai Mirtilli',
        type: 'breakfast',
        baseCalories: 260,
        macros: { protein: 5, carbs: 36, fat: 11 },
        ingredients: [
            { name: 'Farina 00', amount: 280, unit: 'g', category: 'Dispensa' },
            { name: 'Mirtilli freschi', amount: 150, unit: 'g', category: 'Ortofrutta' },
            { name: 'Zucchero', amount: 130, unit: 'g', category: 'Dispensa' },
            { name: 'Uova', amount: 2, unit: 'pz', category: 'Latticini' },
            { name: 'Latte', amount: 80, unit: 'ml', category: 'Latticini' },
            { name: 'Olio di semi', amount: 80, unit: 'ml', category: 'Dispensa' },
            { name: 'Lievito per dolci', amount: 8, unit: 'g', category: 'Dispensa' }
        ],
        instructions: [
            'Mescolate farina, zucchero e lievito. A parte sbattete uova, latte e olio.',
            'Unite i liquidi ai secchi mescolando il minimo indispensabile. Incorporate delicatamente i mirtilli infarinati.',
            'Distribuite il composto negli stampini da muffin riempiendo per 3/4.',
            'Cuocete in forno ventilato a 180°C per 20-25 minuti. Lasciate raffreddare su una gratella.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Muffin-ai-mirtilli.html',
        imageUrl: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=600&auto=format&fit=crop'
    },
    {
        id: 'b8',
        name: 'Smoothie Bowl ai Frutti di Bosco',
        type: 'breakfast',
        baseCalories: 230,
        macros: { protein: 8, carbs: 40, fat: 5 },
        ingredients: [
            { name: 'Frutti di bosco surgelati', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Banana matura', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Yogurt greco', amount: 150, unit: 'g', category: 'Latticini' },
            { name: 'Miele', amount: 1, unit: 'cucchiaio', category: 'Dispensa' },
            { name: 'Granola', amount: 30, unit: 'g', category: 'Dispensa' },
            { name: 'Semi di chia', amount: 1, unit: 'cucchiaio', category: 'Dispensa' }
        ],
        instructions: [
            'Frullate i frutti di bosco con la banana, lo yogurt e il miele fino a ottenere una crema densa.',
            'Versate in una ciotola e livellate la superficie.',
            'Guarnite con granola, frutti di bosco interi, fettine di banana e semi di chia.',
            'Servite subito per mantenere la consistenza cremosa.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Smoothie-bowl.html',
        imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&auto=format&fit=crop'
    },
    {
        id: 'b9',
        name: 'Torta di Mele della Nonna',
        type: 'breakfast',
        baseCalories: 285,
        macros: { protein: 5, carbs: 42, fat: 11 },
        ingredients: [
            { name: 'Mele Golden', amount: 1000, unit: 'g', category: 'Ortofrutta' },
            { name: 'Farina 00', amount: 300, unit: 'g', category: 'Dispensa' },
            { name: 'Zucchero', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Uova', amount: 3, unit: 'pz', category: 'Latticini' },
            { name: 'Burro', amount: 80, unit: 'g', category: 'Latticini' },
            { name: 'Lievito per dolci', amount: 16, unit: 'g', category: 'Dispensa' },
            { name: 'Succo di limone', amount: 1, unit: 'cucchiaio', category: 'Ortofrutta' }
        ],
        instructions: [
            'Sbucciate le mele, tagliatele a fettine sottili e irroratele con succo di limone.',
            'Sbattete le uova con lo zucchero, aggiungete il burro fuso, la farina setacciata e il lievito.',
            'Unite le mele all\'impasto. Versate in una teglia imburrata da 24 cm.',
            'Cuocete in forno statico a 180°C per 40-45 minuti. Spolverizzate con zucchero a velo prima di servire.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Torta-di-mele.html',
        imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=600&auto=format&fit=crop'
    },
    {
        id: 'b10',
        name: 'Ciambellone Classico',
        type: 'breakfast',
        baseCalories: 290,
        macros: { protein: 6, carbs: 40, fat: 12 },
        ingredients: [
            { name: 'Farina 00', amount: 350, unit: 'g', category: 'Dispensa' },
            { name: 'Zucchero', amount: 250, unit: 'g', category: 'Dispensa' },
            { name: 'Uova', amount: 4, unit: 'pz', category: 'Latticini' },
            { name: 'Latte', amount: 130, unit: 'ml', category: 'Latticini' },
            { name: 'Olio di semi', amount: 80, unit: 'ml', category: 'Dispensa' },
            { name: 'Lievito per dolci', amount: 16, unit: 'g', category: 'Dispensa' },
            { name: 'Scorza di limone', amount: 1, unit: 'pz', category: 'Ortofrutta' }
        ],
        instructions: [
            'Sbattete le uova con lo zucchero fino a ottenere un composto chiaro e spumoso.',
            'Aggiungete l\'olio, il latte e la scorza di limone. Incorporate farina e lievito setacciati.',
            'Versate nello stampo da ciambella imburrato e infarinato.',
            'Cuocete in forno statico a 180°C per 40-45 minuti. Sformate e lasciate raffreddare.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Ciambellone.html',
        imageUrl: 'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=600&auto=format&fit=crop'
    },
    // ============================
    // === PRANZI / CENE (1-15) ===
    // ============================
    {
        id: 'l1', name: 'Spaghetti alle Vongole', type: 'lunch', baseCalories: 563,
        macros: { protein: 48, carbs: 71, fat: 9 },
        ingredients: [
            { name: 'Spaghetti', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Vongole veraci', amount: 1000, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Aglio', amount: 2, unit: 'spicchi', category: 'Ortofrutta' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 4, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Spurgate le vongole in acqua salata per 2-3 ore. Apritele in padella con olio e aglio, filtrate il liquido.',
            'Cuocete gli spaghetti a metà cottura. Trasferiteli nel tegame con il fondo delle vongole.',
            'Risottate aggiungendo acqua di cottura. Unite le vongole e prezzemolo tritato. Servite subito.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Spaghetti-alle-vongole.html',
        imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600&auto=format&fit=crop'
    },
    {
        id: 'l2', name: 'Pollo Arrosto alle Erbe', type: 'lunch', baseCalories: 580,
        macros: { protein: 47, carbs: 2, fat: 42 },
        ingredients: [
            { name: 'Pollo intero', amount: 1200, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Rosmarino fresco', amount: 2, unit: 'rametti', category: 'Ortofrutta' },
            { name: 'Salvia fresca', amount: 4, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Aglio', amount: 2, unit: 'spicchi', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Frullate sale grosso con rosmarino, salvia, aglio e origano per creare un trito aromatico.',
            'Spennellate il pollo con olio e ricopritelo con il trito aromatico, massaggiando bene.',
            'Cuocete in forno statico a 180°C per 1 ora, nappando con il fondo. Temperatura interna: 72°C.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pollo-arrosto.html',
        imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74df4f4048?w=600&auto=format&fit=crop'
    },
    {
        id: 'l3', name: 'Insalata di Riso Classica', type: 'lunch', baseCalories: 647,
        macros: { protein: 36, carbs: 73, fat: 23 },
        ingredients: [
            { name: 'Riso Arborio', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Tonno sott\'olio', amount: 160, unit: 'g', category: 'Dispensa' },
            { name: 'Prosciutto cotto', amount: 100, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Scamorza', amount: 100, unit: 'g', category: 'Latticini' },
            { name: 'Pisellini', amount: 100, unit: 'g', category: 'Ortofrutta' },
            { name: 'Olive nere', amount: 60, unit: 'g', category: 'Dispensa' }
        ],
        instructions: [
            'Cuocete il riso, scolatelo e fatelo raffreddare su una teglia con un filo d\'olio.',
            'Tagliate a dadini scamorza, prosciutto e peperoni. Sbollentate i piselli.',
            'Unite tutto al riso freddo con tonno sbriciolato, olive e basilico. Condite e servite fresco.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Insalata-di-riso-classica.html',
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop'
    },
    {
        id: 'l4', name: 'Pasta alla Carbonara', type: 'lunch', baseCalories: 550,
        macros: { protein: 25, carbs: 65, fat: 22 },
        ingredients: [
            { name: 'Rigatoni', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Guanciale', amount: 150, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Tuorli d\'uovo', amount: 6, unit: 'pz', category: 'Latticini' },
            { name: 'Pecorino Romano DOP', amount: 50, unit: 'g', category: 'Latticini' },
            { name: 'Pepe nero in grani', amount: 1, unit: 'cucchiaino', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate il guanciale a listarelle e rosolatelo in padella senza olio finché non diventa croccante.',
            'Sbattete i tuorli con il pecorino grattugiato e abbondante pepe nero macinato.',
            'Cuocete la pasta al dente, scolatela e versatela nella padella con il guanciale a fuoco spento.',
            'Unite la crema di uova e pecorino mescolando vigorosamente. Aggiungete acqua di cottura per la cremosità.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pasta-alla-Carbonara.html',
        imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&auto=format&fit=crop'
    },
    {
        id: 'l5', name: 'Lasagne alla Bolognese', type: 'lunch', baseCalories: 620,
        macros: { protein: 30, carbs: 50, fat: 33 },
        ingredients: [
            { name: 'Sfoglie di lasagna', amount: 250, unit: 'g', category: 'Dispensa' },
            { name: 'Ragu alla bolognese', amount: 500, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Besciamella', amount: 500, unit: 'ml', category: 'Latticini' },
            { name: 'Parmigiano Reggiano', amount: 100, unit: 'g', category: 'Latticini' },
            { name: 'Burro', amount: 30, unit: 'g', category: 'Latticini' }
        ],
        instructions: [
            'Preparate il ragu con carne macinata, sedano, carota, cipolla, passata e vino rosso. Cuocete 2 ore a fuoco lento.',
            'In una pirofila imburrata alternate strati di sfoglia, ragu, besciamella e parmigiano.',
            'Ripetete per 4-5 strati, terminando con besciamella e parmigiano abbondante.',
            'Cuocete in forno a 180°C per 30-35 minuti fino a gratinatura dorata.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Lasagne-alla-bolognese.html',
        imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&auto=format&fit=crop'
    },
    {
        id: 'l6', name: 'Risotto alla Milanese', type: 'lunch', baseCalories: 480,
        macros: { protein: 12, carbs: 70, fat: 16 },
        ingredients: [
            { name: 'Riso Carnaroli', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Zafferano in pistilli', amount: 1, unit: 'bustina', category: 'Dispensa' },
            { name: 'Cipolla dorata', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Brodo di carne', amount: 1000, unit: 'ml', category: 'Dispensa' },
            { name: 'Burro', amount: 50, unit: 'g', category: 'Latticini' },
            { name: 'Parmigiano Reggiano', amount: 60, unit: 'g', category: 'Latticini' }
        ],
        instructions: [
            'Sciogliete lo zafferano in un mestolo di brodo caldo. Fate soffriggere la cipolla tritata nel burro.',
            'Tostate il riso nel soffritto 2 minuti. Sfumate con vino bianco.',
            'Aggiungete il brodo caldo un mestolo alla volta, mescolando spesso per 18 minuti.',
            'Togliete dal fuoco, mantecate con burro e parmigiano. Lasciate riposare 2 minuti e servite.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Risotto-alla-milanese.html',
        imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop'
    },
    {
        id: 'l7', name: 'Parmigiana di Melanzane', type: 'lunch', baseCalories: 520,
        macros: { protein: 22, carbs: 25, fat: 38 },
        ingredients: [
            { name: 'Melanzane', amount: 1000, unit: 'g', category: 'Ortofrutta' },
            { name: 'Passata di pomodoro', amount: 500, unit: 'g', category: 'Dispensa' },
            { name: 'Mozzarella fiordilatte', amount: 250, unit: 'g', category: 'Latticini' },
            { name: 'Parmigiano Reggiano', amount: 80, unit: 'g', category: 'Latticini' },
            { name: 'Basilico fresco', amount: 10, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Olio per friggere', amount: 500, unit: 'ml', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate le melanzane a fette, salatele e fatele spurgare 30 minuti. Friggetele in olio abbondante.',
            'Preparate il sugo con passata, aglio, basilico, sale e olio. Cuocete 15 minuti.',
            'In una pirofila alternate strati di melanzane, sugo, mozzarella a fettine e parmigiano.',
            'Cuocete in forno a 180°C per 30 minuti. Lasciate riposare 10 minuti prima di servire.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Parmigiana-di-melanzane.html',
        imageUrl: 'https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?w=600&auto=format&fit=crop'
    },
    {
        id: 'l8', name: 'Pasta al Pesto Genovese', type: 'lunch', baseCalories: 490,
        macros: { protein: 15, carbs: 62, fat: 20 },
        ingredients: [
            { name: 'Trofie', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Basilico genovese DOP', amount: 60, unit: 'g', category: 'Ortofrutta' },
            { name: 'Pinoli', amount: 30, unit: 'g', category: 'Dispensa' },
            { name: 'Parmigiano Reggiano', amount: 40, unit: 'g', category: 'Latticini' },
            { name: 'Pecorino Sardo', amount: 20, unit: 'g', category: 'Latticini' },
            { name: 'Aglio', amount: 1, unit: 'spicchio', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 60, unit: 'ml', category: 'Dispensa' }
        ],
        instructions: [
            'Nel mortaio pestate aglio e sale grosso, aggiungete i pinoli e il basilico pestando delicatamente.',
            'Incorporate i formaggi grattugiati e l\'olio a filo fino a ottenere una salsa cremosa.',
            'Cuocete le trofie in abbondante acqua salata.',
            'Diluite il pesto con 2 cucchiai di acqua di cottura, conditela pasta e servite senza riscaldare il pesto.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pesto-alla-genovese.html',
        imageUrl: 'https://images.unsplash.com/photo-1473093295043-cdd0b381b6ae?w=600&auto=format&fit=crop'
    },
    {
        id: 'l9', name: 'Cacio e Pepe', type: 'lunch', baseCalories: 470,
        macros: { protein: 18, carbs: 60, fat: 18 },
        ingredients: [
            { name: 'Tonnarelli o spaghetti', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Pecorino Romano DOP', amount: 200, unit: 'g', category: 'Latticini' },
            { name: 'Pepe nero in grani', amount: 2, unit: 'cucchiaini', category: 'Dispensa' }
        ],
        instructions: [
            'Tostate il pepe in grani in padella e pestatelo grossolanamente al mortaio.',
            'Grattuggiate finemente il pecorino e scioglietelo con acqua di cottura tiepida per creare una crema.',
            'Cuocete la pasta molto al dente. Trasferitela nella padella con il pepe, aggiungete la crema di pecorino.',
            'Mantecate vigorosamente aggiungendo acqua di cottura per ottenere una crema avvolgente.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Cacio-e-pepe.html',
        imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&auto=format&fit=crop'
    },
    {
        id: 'l10', name: 'Bucatini all\'Amatriciana', type: 'lunch', baseCalories: 530,
        macros: { protein: 20, carbs: 65, fat: 22 },
        ingredients: [
            { name: 'Bucatini', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Guanciale', amount: 150, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Pomodori pelati', amount: 400, unit: 'g', category: 'Dispensa' },
            { name: 'Pecorino Romano DOP', amount: 60, unit: 'g', category: 'Latticini' },
            { name: 'Peperoncino secco', amount: 1, unit: 'pz', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate il guanciale a listarelle spesse e rosolatelo in padella senza olio fino a renderlo croccante.',
            'Nella stessa padella aggiungete i pelati spezzettati e il peperoncino. Cuocete 15 minuti.',
            'Cuocete i bucatini al dente, scolateli e saltateli nel sugo.',
            'Servite con abbondante pecorino grattugiato e pepe nero.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Bucatini-all-Amatriciana.html',
        imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop'
    },
    {
        id: 'l11', name: 'Pasta e Fagioli', type: 'lunch', baseCalories: 450,
        macros: { protein: 20, carbs: 68, fat: 10 },
        ingredients: [
            { name: 'Pasta mista corta', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Fagioli borlotti', amount: 400, unit: 'g', category: 'Dispensa' },
            { name: 'Sedano', amount: 1, unit: 'costa', category: 'Ortofrutta' },
            { name: 'Carota', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Cipolla', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Passata di pomodoro', amount: 200, unit: 'g', category: 'Dispensa' }
        ],
        instructions: [
            'Fate un soffritto con sedano, carota e cipolla tritati. Aggiungete la passata e cuocete 5 minuti.',
            'Unite i fagioli scolati, coprite con brodo e cuocete 20 minuti. Frullate metà dei fagioli per addensare.',
            'Aggiungete la pasta e cuocete nella zuppa fino a cottura. Servite con olio a crudo e pepe.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pasta-e-fagioli.html',
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop'
    },
    {
        id: 'l12', name: 'Polpette al Sugo', type: 'lunch', baseCalories: 510,
        macros: { protein: 32, carbs: 20, fat: 34 },
        ingredients: [
            { name: 'Carne macinata mista', amount: 500, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Pane raffermo', amount: 100, unit: 'g', category: 'Panetteria' },
            { name: 'Uova', amount: 1, unit: 'pz', category: 'Latticini' },
            { name: 'Parmigiano Reggiano', amount: 50, unit: 'g', category: 'Latticini' },
            { name: 'Passata di pomodoro', amount: 500, unit: 'g', category: 'Dispensa' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' }
        ],
        instructions: [
            'Ammollate il pane nel latte, strizzatelo e unitelo alla carne con uovo, parmigiano, prezzemolo e sale.',
            'Formate polpette della grandezza di una noce e friggetele in olio caldo oppure doratele in padella.',
            'Preparate il sugo con passata, aglio e basilico. Adagiate le polpette nel sugo e cuocete 20 minuti.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Polpette-al-sugo.html',
        imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&auto=format&fit=crop'
    },
    {
        id: 'l13', name: 'Scaloppine al Limone', type: 'lunch', baseCalories: 380,
        macros: { protein: 35, carbs: 8, fat: 23 },
        ingredients: [
            { name: 'Fettine di vitello', amount: 400, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Farina 00', amount: 30, unit: 'g', category: 'Dispensa' },
            { name: 'Limoni', amount: 2, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Burro', amount: 30, unit: 'g', category: 'Latticini' },
            { name: 'Brodo di carne', amount: 100, unit: 'ml', category: 'Dispensa' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' }
        ],
        instructions: [
            'Battete le fettine di vitello con un batticarne e infarinatele leggermente.',
            'Rosolatele nel burro 2 minuti per lato. Sfumate con il succo dei limoni.',
            'Aggiungete il brodo, cuocete 3 minuti e servite con prezzemolo fresco e fettine di limone.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Scaloppine-al-limone.html',
        imageUrl: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=600&auto=format&fit=crop'
    },
    {
        id: 'l14', name: 'Salmone al Forno con Patate', type: 'lunch', baseCalories: 480,
        macros: { protein: 35, carbs: 25, fat: 27 },
        ingredients: [
            { name: 'Filetto di salmone', amount: 600, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Patate', amount: 400, unit: 'g', category: 'Ortofrutta' },
            { name: 'Limone', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate le patate a spicchi e conditele con olio, sale e rosmarino. Disponetele su una teglia.',
            'Adagiate il salmone sulle patate, condite con limone, prezzemolo e olio.',
            'Cuocete a 190°C ventilato per 20-25 minuti. Servite caldo con le patate croccanti.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Salmone-al-forno.html',
        imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&auto=format&fit=crop'
    },
    {
        id: 'l15', name: 'Bruschette al Pomodoro', type: 'lunch', baseCalories: 206,
        macros: { protein: 7, carbs: 33, fat: 5 },
        ingredients: [
            { name: 'Pane casereccio', amount: 300, unit: 'g', category: 'Panetteria' },
            { name: 'Pomodori ramati', amount: 400, unit: 'g', category: 'Ortofrutta' },
            { name: 'Basilico fresco', amount: 8, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Origano', amount: 1, unit: 'cucchiaino', category: 'Dispensa' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate i pomodori a cubetti, conditeli con basilico, origano, sale e olio. Lasciate insaporire 30 minuti.',
            'Grigliate le fette di pane e strofinate con aglio fresco.',
            'Distribuite i pomodori conditi sulle fette. Fate riposare 2 minuti e servite.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Bruschette-al-pomodoro.html',
        imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop'
    },
    // === PRANZI / CENE (16-30) ===
    {
        id: 'l16', name: 'Orecchiette alle Cime di Rapa', type: 'lunch', baseCalories: 420,
        macros: { protein: 14, carbs: 62, fat: 14 },
        ingredients: [
            { name: 'Orecchiette', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Cime di rapa', amount: 500, unit: 'g', category: 'Ortofrutta' },
            { name: 'Aglio', amount: 2, unit: 'spicchi', category: 'Ortofrutta' },
            { name: 'Acciughe sott\'olio', amount: 4, unit: 'filetti', category: 'Dispensa' },
            { name: 'Peperoncino', amount: 1, unit: 'pz', category: 'Dispensa' },
            { name: 'Olio extravergine d\'oliva', amount: 4, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Pulite le cime di rapa eliminando i gambi duri, tenendo le cimette e le foglie tenere.',
            'Cuocete le cime di rapa nella stessa acqua della pasta, scolatele e saltatele con aglio, acciughe e peperoncino.',
            'Cuocete le orecchiette al dente, scolatele e saltatele in padella con le cime di rapa. Servite con olio a crudo.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Orecchiette-alle-cime-di-rapa.html',
        imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=600&auto=format&fit=crop'
    },
    {
        id: 'l17', name: 'Penne all\'Arrabbiata', type: 'lunch', baseCalories: 410,
        macros: { protein: 12, carbs: 65, fat: 12 },
        ingredients: [
            { name: 'Penne rigate', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Pomodori pelati', amount: 400, unit: 'g', category: 'Dispensa' },
            { name: 'Aglio', amount: 2, unit: 'spicchi', category: 'Ortofrutta' },
            { name: 'Peperoncino fresco', amount: 2, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 4, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Soffriggete aglio e peperoncino in olio. Aggiungete i pelati schiacciati e cuocete 15 minuti.',
            'Cuocete le penne al dente, scolatele e saltatele nel sugo piccante.',
            'Servite con prezzemolo fresco tritato e un filo d\'olio a crudo.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Penne-all-arrabbiata.html',
        imageUrl: 'https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=600&auto=format&fit=crop'
    },
    {
        id: 'l18', name: 'Gnocchi di Patate al Pomodoro', type: 'lunch', baseCalories: 440,
        macros: { protein: 10, carbs: 72, fat: 12 },
        ingredients: [
            { name: 'Patate a pasta bianca', amount: 1000, unit: 'g', category: 'Ortofrutta' },
            { name: 'Farina 00', amount: 300, unit: 'g', category: 'Dispensa' },
            { name: 'Uovo', amount: 1, unit: 'pz', category: 'Latticini' },
            { name: 'Passata di pomodoro', amount: 400, unit: 'g', category: 'Dispensa' },
            { name: 'Basilico fresco', amount: 8, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Parmigiano Reggiano', amount: 50, unit: 'g', category: 'Latticini' }
        ],
        instructions: [
            'Lessate le patate con la buccia, pelatele e schiacciatele con lo schiacciapatate ancora calde.',
            'Impastate con farina, uovo e sale. Formate dei filoncini e tagliate gli gnocchi a tocchetti.',
            'Preparate il sugo con passata, aglio e basilico. Tuffate gli gnocchi in acqua bollente salata.',
            'Scolateli appena vengono a galla e conditeli con il sugo e parmigiano.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Gnocchi-di-patate.html',
        imageUrl: 'https://images.unsplash.com/photo-1481931098730-318b6f776db0?w=600&auto=format&fit=crop'
    },
    {
        id: 'l19', name: 'Frittata di Zucchine', type: 'lunch', baseCalories: 350,
        macros: { protein: 20, carbs: 8, fat: 27 },
        ingredients: [
            { name: 'Uova', amount: 6, unit: 'pz', category: 'Latticini' },
            { name: 'Zucchine', amount: 400, unit: 'g', category: 'Ortofrutta' },
            { name: 'Cipolla', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Parmigiano Reggiano', amount: 40, unit: 'g', category: 'Latticini' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate le zucchine a rondelle sottili e fatele saltare con cipolla e olio per 10 minuti.',
            'Sbattete le uova con parmigiano, sale e pepe. Unite le zucchine raffreddate.',
            'Cuocete in padella antiaderente a fuoco basso con coperchio 8 minuti. Girate e cuocete altri 5 minuti.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Frittata-di-zucchine.html',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop'
    },
    {
        id: 'l20', name: 'Caponata Siciliana', type: 'lunch', baseCalories: 280,
        macros: { protein: 5, carbs: 22, fat: 20 },
        ingredients: [
            { name: 'Melanzane', amount: 600, unit: 'g', category: 'Ortofrutta' },
            { name: 'Sedano', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Pomodori pelati', amount: 300, unit: 'g', category: 'Dispensa' },
            { name: 'Olive verdi', amount: 100, unit: 'g', category: 'Dispensa' },
            { name: 'Capperi dissalati', amount: 30, unit: 'g', category: 'Dispensa' },
            { name: 'Aceto di vino rosso', amount: 3, unit: 'cucchiai', category: 'Dispensa' },
            { name: 'Zucchero', amount: 1, unit: 'cucchiaio', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate le melanzane a cubetti e friggetele in olio abbondante. Scolatele su carta assorbente.',
            'Fate soffriggere il sedano a pezzetti, aggiungete pomodori, olive e capperi. Cuocete 10 minuti.',
            'Unite le melanzane fritte, l\'aceto e lo zucchero. Mescolate e cuocete 5 minuti. Servite tiepida o fredda.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Caponata-siciliana.html',
        imageUrl: 'https://images.unsplash.com/photo-1540914124281-342587941389?w=600&auto=format&fit=crop'
    },
    {
        id: 'l21', name: 'Minestrone di Verdure', type: 'lunch', baseCalories: 320,
        macros: { protein: 12, carbs: 48, fat: 8 },
        ingredients: [
            { name: 'Patate', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Zucchine', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Carote', amount: 150, unit: 'g', category: 'Ortofrutta' },
            { name: 'Fagioli borlotti', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Sedano', amount: 100, unit: 'g', category: 'Ortofrutta' },
            { name: 'Passata di pomodoro', amount: 200, unit: 'g', category: 'Dispensa' },
            { name: 'Parmigiano Reggiano', amount: 40, unit: 'g', category: 'Latticini' }
        ],
        instructions: [
            'Tagliate tutte le verdure a dadini. Fate soffriggere cipolla in olio, aggiungete le verdure.',
            'Coprite con acqua, aggiungete la passata e i fagioli. Cuocete a fuoco lento per 40 minuti.',
            'Servite caldo con un filo d\'olio a crudo e parmigiano grattugiato.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Minestrone.html',
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop'
    },
    {
        id: 'l22', name: 'Pasta alla Norma', type: 'lunch', baseCalories: 460,
        macros: { protein: 14, carbs: 64, fat: 17 },
        ingredients: [
            { name: 'Rigatoni', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Melanzane', amount: 500, unit: 'g', category: 'Ortofrutta' },
            { name: 'Passata di pomodoro', amount: 400, unit: 'g', category: 'Dispensa' },
            { name: 'Ricotta salata', amount: 80, unit: 'g', category: 'Latticini' },
            { name: 'Basilico fresco', amount: 10, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Aglio', amount: 1, unit: 'spicchio', category: 'Ortofrutta' }
        ],
        instructions: [
            'Tagliate le melanzane a cubetti e friggetele in olio fino a doratura. Scolate su carta assorbente.',
            'Preparate il sugo con aglio, passata e basilico. Cuocete 15 minuti.',
            'Cuocete la pasta al dente, conditela con il sugo, le melanzane e ricotta salata grattugiata.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pasta-alla-norma.html',
        imageUrl: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=600&auto=format&fit=crop'
    },
    {
        id: 'l23', name: 'Involtini di Carne', type: 'lunch', baseCalories: 430,
        macros: { protein: 35, carbs: 5, fat: 30 },
        ingredients: [
            { name: 'Fettine di vitello', amount: 400, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Prosciutto crudo', amount: 80, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Scamorza', amount: 100, unit: 'g', category: 'Latticini' },
            { name: 'Vino bianco', amount: 100, unit: 'ml', category: 'Dispensa' },
            { name: 'Salvia fresca', amount: 8, unit: 'foglie', category: 'Ortofrutta' }
        ],
        instructions: [
            'Stendete le fettine, farcite con prosciutto crudo e scamorza a fettine. Arrotolate e fissate con stecchini.',
            'Rosolate gli involtini nel burro con la salvia su tutti i lati. Sfumate con il vino bianco.',
            'Cuocete a fuoco medio con coperchio per 15 minuti. Servite con il fondo di cottura.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Involtini-di-carne.html',
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop'
    },
    {
        id: 'l24', name: 'Risotto ai Funghi Porcini', type: 'lunch', baseCalories: 490,
        macros: { protein: 12, carbs: 68, fat: 18 },
        ingredients: [
            { name: 'Riso Carnaroli', amount: 320, unit: 'g', category: 'Dispensa' },
            { name: 'Funghi porcini', amount: 300, unit: 'g', category: 'Ortofrutta' },
            { name: 'Cipolla', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Brodo vegetale', amount: 1000, unit: 'ml', category: 'Dispensa' },
            { name: 'Burro', amount: 50, unit: 'g', category: 'Latticini' },
            { name: 'Parmigiano Reggiano', amount: 60, unit: 'g', category: 'Latticini' },
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' }
        ],
        instructions: [
            'Pulite e affettate i funghi. Saltateli in padella con aglio e prezzemolo, teneteli da parte.',
            'Fate soffriggere la cipolla nel burro, tostate il riso e sfumate con vino bianco.',
            'Aggiungete brodo un mestolo alla volta per 18 minuti. Unite i funghi a metà cottura.',
            'Mantecate con burro e parmigiano. Lasciate riposare 2 minuti e servite.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Risotto-ai-funghi-porcini.html',
        imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&auto=format&fit=crop'
    },
    {
        id: 'l25', name: 'Tagliata di Manzo con Rucola', type: 'lunch', baseCalories: 450,
        macros: { protein: 40, carbs: 3, fat: 30 },
        ingredients: [
            { name: 'Controfiletto di manzo', amount: 600, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Rucola', amount: 100, unit: 'g', category: 'Ortofrutta' },
            { name: 'Parmigiano Reggiano a scaglie', amount: 60, unit: 'g', category: 'Latticini' },
            { name: 'Limone', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Portate la carne a temperatura ambiente. Scaldate una griglia o padella in ghisa fumante.',
            'Cuocete la carne 3-4 minuti per lato (al sangue). Lasciate riposare 5 minuti coperta con alluminio.',
            'Tagliate a fette di 1 cm, adagiate su un letto di rucola e guarnite con scaglie di parmigiano e limone.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Tagliata-di-manzo.html',
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=600&auto=format&fit=crop'
    },
    {
        id: 'l26', name: 'Branzino al Forno con Patate', type: 'lunch', baseCalories: 390,
        macros: { protein: 38, carbs: 20, fat: 18 },
        ingredients: [
            { name: 'Branzino intero', amount: 800, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Patate', amount: 400, unit: 'g', category: 'Ortofrutta' },
            { name: 'Pomodorini', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Olive taggiasche', amount: 50, unit: 'g', category: 'Dispensa' },
            { name: 'Olio extravergine d\'oliva', amount: 3, unit: 'cucchiai', category: 'Dispensa' }
        ],
        instructions: [
            'Squamate e pulite il branzino. Farcite con rosmarino, aglio e fettine di limone.',
            'Disponete patate a fette, pomodorini e olive nella teglia. Adagiate il pesce sopra.',
            'Cuocete a 200°C per 25-30 minuti. Servite con il sughetto della teglia.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Branzino-al-forno.html',
        imageUrl: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=600&auto=format&fit=crop'
    },
    {
        id: 'l27', name: 'Pasta e Patate', type: 'lunch', baseCalories: 420,
        macros: { protein: 12, carbs: 70, fat: 10 },
        ingredients: [
            { name: 'Pasta mista corta', amount: 250, unit: 'g', category: 'Dispensa' },
            { name: 'Patate', amount: 400, unit: 'g', category: 'Ortofrutta' },
            { name: 'Pancetta', amount: 80, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Sedano', amount: 1, unit: 'costa', category: 'Ortofrutta' },
            { name: 'Carota', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Parmigiano Reggiano', amount: 40, unit: 'g', category: 'Latticini' }
        ],
        instructions: [
            'Fate un soffritto con pancetta, sedano, carota e cipolla. Aggiungete le patate a cubetti.',
            'Coprite con acqua, cuocete 15 minuti poi aggiungete la pasta e cuocete nella zuppa.',
            'Servite densa con parmigiano grattugiato, pepe e un filo d\'olio a crudo.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Pasta-e-patate.html',
        imageUrl: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&auto=format&fit=crop'
    },
    {
        id: 'l28', name: 'Zuppa di Legumi e Cereali', type: 'lunch', baseCalories: 380,
        macros: { protein: 18, carbs: 58, fat: 8 },
        ingredients: [
            { name: 'Mix di legumi secchi', amount: 300, unit: 'g', category: 'Dispensa' },
            { name: 'Farro', amount: 100, unit: 'g', category: 'Dispensa' },
            { name: 'Carota', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Sedano', amount: 1, unit: 'costa', category: 'Ortofrutta' },
            { name: 'Cipolla', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Passata di pomodoro', amount: 200, unit: 'g', category: 'Dispensa' }
        ],
        instructions: [
            'Mettete i legumi in ammollo per 12 ore. Scolateli e sciacquateli.',
            'Fate un soffritto, aggiungete legumi, farro, passata e coprite con acqua. Cuocete 45 minuti.',
            'Regolate di sale, servite con un filo d\'olio a crudo e crostini di pane.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Zuppa-di-legumi.html',
        imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&auto=format&fit=crop'
    },
    {
        id: 'l29', name: 'Melanzane Ripiene', type: 'lunch', baseCalories: 340,
        macros: { protein: 16, carbs: 18, fat: 24 },
        ingredients: [
            { name: 'Melanzane', amount: 4, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Carne macinata', amount: 200, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Pomodorini', amount: 200, unit: 'g', category: 'Ortofrutta' },
            { name: 'Mozzarella', amount: 100, unit: 'g', category: 'Latticini' },
            { name: 'Parmigiano Reggiano', amount: 40, unit: 'g', category: 'Latticini' },
            { name: 'Basilico fresco', amount: 6, unit: 'foglie', category: 'Ortofrutta' }
        ],
        instructions: [
            'Dimezzate le melanzane e scavate la polpa. Saltatela con la carne macinata e i pomodorini.',
            'Farcite le melanzane con il ripieno, aggiungete mozzarella a cubetti e parmigiano.',
            'Cuocete in forno a 180°C per 30 minuti fino a gratinatura. Guarnite con basilico fresco.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Melanzane-ripiene.html',
        imageUrl: 'https://images.unsplash.com/photo-1625944230945-1b7dd3b949ab?w=600&auto=format&fit=crop'
    },
    {
        id: 'l30', name: 'Piadina Romagnola Farcita', type: 'lunch', baseCalories: 490,
        macros: { protein: 22, carbs: 48, fat: 24 },
        ingredients: [
            { name: 'Farina 00', amount: 500, unit: 'g', category: 'Dispensa' },
            { name: 'Strutto o olio', amount: 80, unit: 'g', category: 'Dispensa' },
            { name: 'Squacquerone', amount: 200, unit: 'g', category: 'Latticini' },
            { name: 'Prosciutto crudo', amount: 150, unit: 'g', category: 'Carne e Pesce' },
            { name: 'Rucola', amount: 60, unit: 'g', category: 'Ortofrutta' }
        ],
        instructions: [
            'Impastate farina, strutto, sale, bicarbonato e acqua tiepida. Fate riposare 30 minuti.',
            'Stendete la pasta in dischi sottili e cuocete su piastra o padella caldissima 2 minuti per lato.',
            'Farcite con squacquerone, prosciutto crudo e rucola. Piegate a metà e servite calda.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Piadina-romagnola.html',
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop'
    },
    // ============================
    // === SPUNTINI (5) ===
    // ============================
    {
        id: 's1', name: 'Hummus di Ceci', type: 'snack', baseCalories: 210,
        macros: { protein: 8, carbs: 22, fat: 10 },
        ingredients: [
            { name: 'Ceci precotti', amount: 240, unit: 'g', category: 'Dispensa' },
            { name: 'Crema di sesamo (Tahina)', amount: 30, unit: 'g', category: 'Dispensa' },
            { name: 'Succo di limone', amount: 2, unit: 'cucchiai', category: 'Ortofrutta' },
            { name: 'Aglio', amount: 1, unit: 'spicchio', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 2, unit: 'cucchiai', category: 'Dispensa' },
            { name: 'Carote e sedano', amount: 200, unit: 'g', category: 'Ortofrutta' }
        ],
        instructions: [
            'Frullate ceci, tahina, succo di limone, aglio e un pizzico di sale aggiungendo acqua per la cremosita.',
            'Tagliate carote e sedano a bastoncini.',
            'Servite l\'hummus con un filo d\'olio, paprika e le verdure crude per intingere.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Hummus-di-ceci.html',
        imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=600&auto=format&fit=crop'
    },
    {
        id: 's2', name: 'Bruschetta Caprese', type: 'snack', baseCalories: 220,
        macros: { protein: 9, carbs: 20, fat: 11 },
        ingredients: [
            { name: 'Pane casereccio', amount: 2, unit: 'fette', category: 'Panetteria' },
            { name: 'Pomodorini', amount: 100, unit: 'g', category: 'Ortofrutta' },
            { name: 'Mozzarella fiordilatte', amount: 50, unit: 'g', category: 'Latticini' },
            { name: 'Basilico fresco', amount: 4, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Olio extravergine d\'oliva', amount: 1, unit: 'cucchiaio', category: 'Dispensa' }
        ],
        instructions: [
            'Tagliate pomodorini e mozzarella a cubetti. Condite con sale, olio e basilico.',
            'Tostate le fette di pane sulla griglia.',
            'Disponete il condimento sulle fette e servite subito.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Bruschette-al-pomodoro.html',
        imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&auto=format&fit=crop'
    },
    {
        id: 's3', name: 'Panna Cotta alla Vaniglia', type: 'snack', baseCalories: 250,
        macros: { protein: 4, carbs: 28, fat: 14 },
        ingredients: [
            { name: 'Panna fresca', amount: 500, unit: 'ml', category: 'Latticini' },
            { name: 'Zucchero', amount: 80, unit: 'g', category: 'Dispensa' },
            { name: 'Colla di pesce', amount: 8, unit: 'g', category: 'Dispensa' },
            { name: 'Baccello di vaniglia', amount: 1, unit: 'pz', category: 'Dispensa' },
            { name: 'Frutti di bosco', amount: 100, unit: 'g', category: 'Ortofrutta' }
        ],
        instructions: [
            'Ammollate la colla di pesce in acqua fredda. Scaldate la panna con zucchero e semi di vaniglia senza bollire.',
            'Togliete dal fuoco, scioglietevi la colla di pesce strizzata. Mescolate bene.',
            'Versate negli stampini e lasciate in frigo almeno 4 ore. Servite con frutti di bosco.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Panna-cotta.html',
        imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop'
    },
    {
        id: 's4', name: 'Macedonia di Frutta Fresca', type: 'snack', baseCalories: 120,
        macros: { protein: 2, carbs: 28, fat: 1 },
        ingredients: [
            { name: 'Fragole', amount: 150, unit: 'g', category: 'Ortofrutta' },
            { name: 'Kiwi', amount: 2, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Banana', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Mela', amount: 1, unit: 'pz', category: 'Ortofrutta' },
            { name: 'Succo di arancia', amount: 100, unit: 'ml', category: 'Ortofrutta' },
            { name: 'Zucchero', amount: 1, unit: 'cucchiaio', category: 'Dispensa' }
        ],
        instructions: [
            'Lavate e tagliate tutta la frutta a pezzetti regolari in una ciotola capiente.',
            'Conditela con succo d\'arancia e zucchero. Mescolate delicatamente.',
            'Lasciate riposare in frigo almeno 30 minuti prima di servire per far amalgamare i sapori.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Macedonia.html',
        imageUrl: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600&auto=format&fit=crop'
    },
    {
        id: 's5', name: 'Yogurt Greco con Miele e Noci', type: 'snack', baseCalories: 195,
        macros: { protein: 12, carbs: 18, fat: 9 },
        ingredients: [
            { name: 'Yogurt greco intero', amount: 200, unit: 'g', category: 'Latticini' },
            { name: 'Miele millefiori', amount: 2, unit: 'cucchiai', category: 'Dispensa' },
            { name: 'Noci', amount: 20, unit: 'g', category: 'Dispensa' },
            { name: 'Mirtilli freschi', amount: 50, unit: 'g', category: 'Ortofrutta' }
        ],
        instructions: [
            'Versate lo yogurt greco in una ciotola.',
            'Guarnite con il miele, le noci spezzettate grossolanamente e i mirtilli.',
            'Servite subito come spuntino energetico e nutriente.'
        ],
        sourceUrl: 'https://ricette.giallozafferano.it/Yogurt-greco-con-miele-e-noci.html',
        imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop'
    }
];

// Filtri per tipo
const breakfastsDB = recipesDB.filter(r => r.type === 'breakfast');
const lunchesDB    = recipesDB.filter(r => r.type === 'lunch');
const snacksDB     = recipesDB.filter(r => r.type === 'snack');
