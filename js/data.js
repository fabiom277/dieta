// --- DATABASE RICETTE REALI (DIETA MEDITERRANEA CURATA) ---
// Fonte: GialloZafferano, Fatto in casa da Benedetta, Casa Pappagallo, Cucchiaio d'Argento

const recipesDB = [
    // === COLAZIONI ===
    { 
        id: 'b1', 
        name: 'Pancake allo Yogurt Senza Burro', 
        type: 'breakfast', 
        baseCalories: 350, 
        macros: { protein: 12, carbs: 45, fat: 10 }, 
        ingredients: [
            { name: 'Farina 00', amount: 50, unit: 'g', category: 'Dispensa' }, 
            { name: 'Yogurt bianco naturale', amount: 100, unit: 'g', category: 'Latticini' }, 
            { name: 'Uova', amount: 1, unit: 'pz', category: 'Latticini' }, 
            { name: 'Zucchero', amount: 10, unit: 'g', category: 'Dispensa' }
        ], 
        instructions: [
            'In una ciotola, sbatti l\'uovo con lo zucchero usando una frusta a mano fino ad ottenere un composto chiaro.', 
            'Aggiungi lo yogurt bianco e mescola bene per amalgamarlo.', 
            'Setaccia la farina con un cucchiaino di lievito per dolci e uniscila al composto liquido poco alla volta.', 
            'Scalda una padella antiaderente leggermente unta. Versa un mestolo di impasto per ogni pancake.', 
            'Quando compaiono delle bollicine in superficie (circa 2 minuti), gira il pancake e cuoci l\'altro lato per un altro minuto.'
        ], 
        sourceUrl: 'https://www.fattoincasadabenedetta.it/ricetta/pancake-allo-yogurt/', 
        imageUrl: 'https://images.unsplash.com/photo-1528207776546-384cb1119b71?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'b2', 
        name: 'Porridge Avena e Mirtilli', 
        type: 'breakfast', 
        baseCalories: 320, 
        macros: { protein: 10, carbs: 55, fat: 7 }, 
        ingredients: [
            { name: 'Fiocchi d\'avena', amount: 50, unit: 'g', category: 'Dispensa' }, 
            { name: 'Latte (vaccino o vegetale)', amount: 200, unit: 'ml', category: 'Latticini' }, 
            { name: 'Mirtilli freschi', amount: 80, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Miele', amount: 10, unit: 'g', category: 'Dispensa' }
        ], 
        instructions: [
            'Versa i fiocchi d\'avena e il latte in un piccolo pentolino antiaderente.', 
            'Porta a ebollizione a fuoco medio-basso, mescolando continuamente con un cucchiaio di legno.', 
            'Lascia cuocere per circa 5-7 minuti, finché l\'avena non avrà assorbito i liquidi diventando cremosa.', 
            'Trasferisci il porridge in una tazza o ciotolina e lascia intiepidire un minuto.', 
            'Guarnisci la superficie con i mirtilli freschi (precedentemente lavati) e un filo di miele a crudo.'
        ], 
        sourceUrl: 'https://ricette.giallozafferano.it/Porridge.html', 
        imageUrl: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'b3', 
        name: 'Torta di Mele Soffice (Fetta)', 
        type: 'breakfast', 
        baseCalories: 380, 
        macros: { protein: 6, carbs: 60, fat: 12 }, 
        ingredients: [
            { name: 'Farina 00', amount: 300, unit: 'g', category: 'Dispensa' }, 
            { name: 'Mele', amount: 3, unit: 'pz', category: 'Ortofrutta' }, 
            { name: 'Uova', amount: 3, unit: 'pz', category: 'Latticini' }, 
            { name: 'Olio di semi', amount: 100, unit: 'ml', category: 'Dispensa' }
        ], 
        instructions: [
            'Sbuccia le mele e tagliale a fettine sottili. Mettile in una ciotola con un po\' di succo di limone per non farle annerire.', 
            'In una terrina capiente, monta le uova con lo zucchero fino a renderle spumose.', 
            'Aggiungi l\'olio di semi a filo continuando a frullare, poi incorpora la farina setacciata con il lievito.', 
            'Aggiungi metà delle mele all\'impasto e mescola con una spatola. Versa in una tortiera imburrata e infarinata.', 
            'Disponi le restanti mele a raggiera sulla superficie. Inforna a 180°C (forno statico) per 40-45 minuti.'
        ], 
        sourceUrl: 'https://www.fattoincasadabenedetta.it/ricetta/torta-di-mele-soffice-fatto-in-casa-da-benedetta/', 
        imageUrl: 'https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'b4', 
        name: 'Avocado Toast con Uovo in Camicia', 
        type: 'breakfast', 
        baseCalories: 410, 
        macros: { protein: 18, carbs: 30, fat: 22 }, 
        ingredients: [
            { name: 'Pane integrale', amount: 2, unit: 'fette', category: 'Panetteria' }, 
            { name: 'Avocado maturo', amount: 0.5, unit: 'pz', category: 'Ortofrutta' }, 
            { name: 'Uova', amount: 1, unit: 'pz', category: 'Latticini' }, 
            { name: 'Succo di limone', amount: 5, unit: 'ml', category: 'Ortofrutta' }
        ], 
        instructions: [
            'Tosta le fette di pane integrale nel tostapane o in padella finché non sono croccanti.', 
            'Estrai la polpa di mezzo avocado e schiacciala in una ciotolina con una forchetta. Aggiungi sale, pepe e succo di limone.', 
            'Porta a bollore dell\'acqua in un pentolino con un cucchiaio di aceto. Crea un vortice e fai scivolare l\'uovo al centro. Cuoci per 3 minuti.', 
            'Spalma la crema di avocado sulle fette di pane tostato.', 
            'Scola l\'uovo in camicia con una schiumarola, asciugalo delicatamente e adagialo sopra l\'avocado. Rompi il tuorlo al momento di servire.'
        ], 
        sourceUrl: 'https://www.cucchiaio.it/ricetta/avocado-toast-con-uovo-in-camicia/', 
        imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'b5', 
        name: 'Plumcake Integrale allo Yogurt', 
        type: 'breakfast', 
        baseCalories: 330, 
        macros: { protein: 8, carbs: 45, fat: 12 }, 
        ingredients: [
            { name: 'Farina Integrale', amount: 250, unit: 'g', category: 'Dispensa' }, 
            { name: 'Yogurt greco', amount: 150, unit: 'g', category: 'Latticini' }, 
            { name: 'Uova', amount: 3, unit: 'pz', category: 'Latticini' }, 
            { name: 'Zucchero di canna', amount: 100, unit: 'g', category: 'Dispensa' }
        ], 
        instructions: [
            'Monta le uova con lo zucchero di canna fino ad ottenere un composto gonfio.', 
            'Aggiungi lo yogurt a temperatura ambiente e l\'olio a filo, sempre mescolando con le fruste elettriche.', 
            'Incorpora gradualmente la farina integrale e infine la bustina di lievito per dolci setacciato.', 
            'Versa l\'impasto in uno stampo da plumcake rivestito di carta forno.', 
            'Cuoci in forno statico preriscaldato a 180°C per circa 40-45 minuti. Fai la prova stecchino prima di sfornare.'
        ], 
        sourceUrl: 'https://ricette.giallozafferano.it/Plumcake-allo-yogurt.html', 
        imageUrl: 'https://images.unsplash.com/photo-1599321955726-e048426594af?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'b6', 
        name: 'Biscotti Inzuppo della Nonna', 
        type: 'breakfast', 
        baseCalories: 340, 
        macros: { protein: 7, carbs: 55, fat: 11 }, 
        ingredients: [
            { name: 'Farina 00', amount: 500, unit: 'g', category: 'Dispensa' }, 
            { name: 'Latte', amount: 100, unit: 'ml', category: 'Latticini' }, 
            { name: 'Ammoniaca per dolci', amount: 10, unit: 'g', category: 'Dispensa' }, 
            { name: 'Uova', amount: 2, unit: 'pz', category: 'Latticini' }
        ], 
        instructions: [
            'Sciogli l\'ammoniaca per dolci nel latte tiepido (noterai che fa molta schiuma, è normale).', 
            'In una ciotola, mescola la farina, lo zucchero, l\'olio, le uova e aggiungi il latte con l\'ammoniaca.', 
            'Impasta a mano fino ad ottenere un panetto morbido e leggermente appiccicoso.', 
            'Stacca dei pezzetti d\'impasto, forma dei filoncini spessi circa 2 cm e passali nello zucchero semolato.', 
            'Disponi i biscotti su una teglia e inforna a 180°C per 20 minuti, finché non saranno dorati e gonfi.'
        ], 
        sourceUrl: 'https://www.fattoincasadabenedetta.it/ricetta/biscotti-da-inzuppo/', 
        imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80' 
    },

    // === PRANZI / CENE ===
    { 
        id: 'l1', 
        name: 'Pasta e Patate con la Provola', 
        type: 'lunch', 
        baseCalories: 550, 
        macros: { protein: 18, carbs: 75, fat: 18 }, 
        ingredients: [
            { name: 'Pasta mista', amount: 80, unit: 'g', category: 'Dispensa' }, 
            { name: 'Patate', amount: 250, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Provola affumicata', amount: 60, unit: 'g', category: 'Latticini' }, 
            { name: 'Parmigiano Reggiano', amount: 15, unit: 'g', category: 'Latticini' }
        ], 
        instructions: [
            'Pela le patate e tagliale a cubetti piccoli. Trita finemente mezza cipolla, una costa di sedano e una carota piccola.', 
            'Fai rosolare il trito in pentola con due cucchiai d\'olio, poi aggiungi le patate e lasciale insaporire per un paio di minuti.', 
            'Copri le patate con acqua bollente (o brodo) e cuoci per 20 minuti finché non si sfaldano un po\'.', 
            'Cala la pasta mista direttamente nella pentola con le patate, aggiungendo acqua bollente se necessario (cottura risottata).', 
            'A cottura ultimata, spegni il fuoco, aggiungi la provola tagliata a dadini e il parmigiano. Mescola energicamente per creare la tipica "azzeccatura" filante.'
        ], 
        sourceUrl: 'https://www.casapappagallo.it/ricette/primi/pasta-e-patate-con-la-provola', 
        imageUrl: 'https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l2', 
        name: 'Pollo al Forno con Patate Croccanti', 
        type: 'lunch', 
        baseCalories: 520, 
        macros: { protein: 42, carbs: 45, fat: 16 }, 
        ingredients: [
            { name: 'Cosce o sovracosce di pollo', amount: 250, unit: 'g', category: 'Carne e Pesce' }, 
            { name: 'Patate', amount: 300, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Rosmarino', amount: 1, unit: 'rametto', category: 'Ortofrutta' }, 
            { name: 'Olio extravergine', amount: 15, unit: 'ml', category: 'Dispensa' }
        ], 
        instructions: [
            'Pela le patate, tagliale a spicchi e sbollentale in acqua salata per 5 minuti. Scola e asciugale bene (questo le renderà croccantissime).', 
            'In una ciotola capiente, condisci le fette di pollo e le patate con olio extravergine, sale, pepe e aghi di rosmarino fresco.', 
            'Disponi pollo e patate su una teglia foderata con carta forno, facendo attenzione a non sovrapporre le patate.', 
            'Inforna in forno statico preriscaldato a 200°C per circa 45-50 minuti.', 
            'Negli ultimi 5 minuti, attiva la funzione grill per far dorare la pelle del pollo e rendere le patate super croccanti.'
        ], 
        sourceUrl: 'https://ricette.giallozafferano.it/Pollo-al-forno-con-patate.html', 
        imageUrl: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l3', 
        name: 'Spaghetti alle Vongole', 
        type: 'lunch', 
        baseCalories: 480, 
        macros: { protein: 28, carbs: 70, fat: 12 }, 
        ingredients: [
            { name: 'Spaghetti', amount: 100, unit: 'g', category: 'Dispensa' }, 
            { name: 'Vongole veraci', amount: 500, unit: 'g', category: 'Carne e Pesce' }, 
            { name: 'Aglio', amount: 1, unit: 'spicchio', category: 'Ortofrutta' }, 
            { name: 'Prezzemolo fresco', amount: 1, unit: 'mazzetto', category: 'Ortofrutta' }
        ], 
        instructions: [
            'Fai spurgare le vongole in acqua fredda e sale per un paio d\'ore, cambiando l\'acqua per eliminare la sabbia.', 
            'In una padella capiente, fai rosolare lo spicchio d\'aglio schiacciato con un bel giro d\'olio e i gambi del prezzemolo.', 
            'Aggiungi le vongole, copri con un coperchio e lasciale aprire a fiamma vivace (ci vorranno pochi minuti). Togli le vongole aperte e filtra il fondo di cottura.', 
            'Scola gli spaghetti molto al dente (3-4 minuti prima) e tuffali nella padella col sughetto filtrato delle vongole.', 
            'Termina la cottura risottando la pasta nel sugo. A fuoco spento, unisci le vongole e abbondante prezzemolo tritato finissimo.'
        ], 
        sourceUrl: 'https://ricette.giallozafferano.it/Spaghetti-alle-vongole.html', 
        imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l4', 
        name: 'Melanzane alla Parmigiana (Leggera)', 
        type: 'lunch', 
        baseCalories: 420, 
        macros: { protein: 22, carbs: 20, fat: 28 }, 
        ingredients: [
            { name: 'Melanzane', amount: 300, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Passata di pomodoro', amount: 200, unit: 'ml', category: 'Dispensa' }, 
            { name: 'Mozzarella fiordilatte', amount: 100, unit: 'g', category: 'Latticini' }, 
            { name: 'Parmigiano grattugiato', amount: 30, unit: 'g', category: 'Latticini' }
        ], 
        instructions: [
            'Taglia le melanzane a fette spesse circa mezzo centimetro. Invece di friggerle, spennellale d\'olio e grigliale su una piastra rovente da entrambi i lati.', 
            'Prepara un sugo semplice cuocendo la passata di pomodoro con uno spicchio d\'aglio, basilico, sale e un filo d\'olio per 15 minuti.', 
            'In una pirofila, sporca il fondo con il sugo e crea il primo strato di melanzane grigliate.', 
            'Aggiungi sugo, mozzarella a cubetti (ben sgocciolata), abbondante parmigiano e foglie di basilico fresco.', 
            'Ripeti gli strati fino a esaurimento ingredienti, terminando con sugo e parmigiano. Inforna a 200°C per 25-30 minuti.'
        ], 
        sourceUrl: 'https://www.cucchiaio.it/ricetta/parmigiana-di-melanzane-light/', 
        imageUrl: 'https://images.unsplash.com/photo-1598449089053-157cb76ffeb1?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l5', 
        name: 'Insalata di Riso Classica', 
        type: 'lunch', 
        baseCalories: 490, 
        macros: { protein: 18, carbs: 70, fat: 16 }, 
        ingredients: [
            { name: 'Riso per insalate', amount: 80, unit: 'g', category: 'Dispensa' }, 
            { name: 'Tonno sott\'olio sgocciolato', amount: 80, unit: 'g', category: 'Dispensa' }, 
            { name: 'Olive denocciolate', amount: 30, unit: 'g', category: 'Dispensa' }, 
            { name: 'Uova', amount: 1, unit: 'pz', category: 'Latticini' },
            { name: 'Pomodorini', amount: 100, unit: 'g', category: 'Ortofrutta' }
        ], 
        instructions: [
            'Lessa il riso in abbondante acqua salata, scolalo al dente e passalo sotto un getto rapido di acqua fredda per fermare la cottura.', 
            'Nel frattempo, metti a rassodare l\'uovo in un pentolino per 9 minuti dal bollore. Sbuccialo e taglialo a spicchi.', 
            'In una ciotola capiente, metti il tonno sgocciolato, le olive tagliate a rondelle, e i pomodorini tagliati a quarti.', 
            'Aggiungi il riso ormai freddo agli ingredienti, condisci con un filo d\'olio extravergine e mescola bene.', 
            'Disponi gli spicchi di uovo sodo sulla superficie e lascia riposare in frigo per almeno un\'ora prima di servire.'
        ], 
        sourceUrl: 'https://www.fattoincasadabenedetta.it/ricetta/insalata-di-riso-classica/', 
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l6', 
        name: 'Zuppa di Fagioli Borlotti e Bietole', 
        type: 'lunch', 
        baseCalories: 410, 
        macros: { protein: 20, carbs: 60, fat: 10 }, 
        ingredients: [
            { name: 'Fagioli Borlotti (secchi o precotti)', amount: 150, unit: 'g', category: 'Dispensa' }, 
            { name: 'Bietole fresche', amount: 200, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Crostini di pane', amount: 40, unit: 'g', category: 'Panetteria' }, 
            { name: 'Olio extravergine', amount: 10, unit: 'ml', category: 'Dispensa' }
        ], 
        instructions: [
            'Lava bene le bietole e tagliale a listarelle grosse. Trita uno spicchio d\'aglio e fallo dorare in una pentola con un filo d\'olio.', 
            'Aggiungi le bietole in pentola, copri con un coperchio e falle appassire per 5 minuti.', 
            'Unisci i fagioli borlotti (se usi quelli in scatola, sciacquali bene) e allunga con due mestoli di acqua o brodo vegetale caldo.', 
            'Lascia sobbollire il tutto per circa 15-20 minuti per far amalgamare i sapori. Aggiusta di sale e pepe.', 
            'Servi la zuppa calda in un piatto fondo, accompagnata da crostini di pane tostato e un giro di olio a crudo.'
        ], 
        tags: ['vegano', 'zuppa'],
        sourceUrl: 'https://www.cucchiaio.it/ricetta/zuppa-di-fagioli-e-bietole/', 
        imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l7', 
        name: 'Trancio di Salmone al Forno con Zucchine', 
        type: 'lunch', 
        baseCalories: 480, 
        macros: { protein: 35, carbs: 10, fat: 32 }, 
        ingredients: [
            { name: 'Trancio di salmone', amount: 200, unit: 'g', category: 'Carne e Pesce' }, 
            { name: 'Zucchine', amount: 250, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Limone', amount: 1, unit: 'pz', category: 'Ortofrutta' }, 
            { name: 'Prezzemolo', amount: 5, unit: 'g', category: 'Ortofrutta' }
        ], 
        instructions: [
            'Lava le zucchine e tagliale a rondelle sottili. Disponile su una teglia coperta da carta forno, condisci con sale, pepe e un filo d\'olio.', 
            'Adagia il trancio di salmone sopra il letto di zucchine.', 
            'Condisci il salmone con fettine di limone, prezzemolo tritato, sale, e un filo d\'olio extravergine.', 
            'Inforna a 190°C (forno ventilato) per circa 15-18 minuti, a seconda dello spessore del filetto.', 
            'Sforna e servi ben caldo, accompagnato dalle zucchine morbide.'
        ], 
        sourceUrl: 'https://ricette.giallozafferano.it/Salmone-al-forno.html', 
        imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80' 
    },

    { 
        id: 'l8', 
        name: 'Insalata di Farro Pesto e Pomodorini', 
        type: 'lunch', 
        baseCalories: 450, 
        macros: { protein: 12, carbs: 65, fat: 18 }, 
        ingredients: [
            { name: 'Farro perlato', amount: 80, unit: 'g', category: 'Dispensa' }, 
            { name: 'Pesto alla Genovese', amount: 20, unit: 'g', category: 'Dispensa' }, 
            { name: 'Pomodorini', amount: 150, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Mozzarelline', amount: 50, unit: 'g', category: 'Latticini' }
        ], 
        instructions: [
            'Sciacqua il farro sotto acqua corrente, poi cuocilo in acqua bollente salata per circa 25-30 minuti (o secondo le indicazioni della confezione). Scolalo e fallo raffreddare.', 
            'Taglia i pomodorini a metà e le mozzarelline in quarti.', 
            'Versa il farro freddo in una ciotola capiente e condiscilo con il pesto, mescolando bene per sgranare i chicchi.', 
            'Aggiungi i pomodorini e le mozzarelline. Se necessario, unisci un filo d\'olio a crudo e qualche foglia di basilico.', 
            'Riponi in frigo per almeno 30 minuti prima di gustare, ideale per la pausa pranzo al lavoro.'
        ], 
        sourceUrl: 'https://www.fattoincasadabenedetta.it/ricetta/insalata-di-farro-fredda/', 
        imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l9', 
        name: 'Straccetti di Manzo Rucola e Grana', 
        type: 'lunch', 
        baseCalories: 510, 
        macros: { protein: 45, carbs: 5, fat: 30 }, 
        ingredients: [
            { name: 'Fettine di manzo (carpaccio o straccetti)', amount: 200, unit: 'g', category: 'Carne e Pesce' }, 
            { name: 'Rucola fresca', amount: 80, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Grana Padano (scaglie)', amount: 30, unit: 'g', category: 'Latticini' }, 
            { name: 'Olio extravergine', amount: 15, unit: 'ml', category: 'Dispensa' }
        ], 
        instructions: [
            'Distribuisci la rucola lavata e asciugata su un ampio piatto da portata o vassoio.', 
            'Scalda benissimo una piastra di ghisa o una padella antiaderente con un pizzico di sale grosso sul fondo.', 
            'Cuoci gli straccetti di carne per pochissimi secondi (massimo 1 minuto per lato) a fiamma altissima, mantenendoli morbidi.', 
            'Adagia la carne rovente direttamente sul letto di rucola.', 
            'Condisci subito con olio, pepe, e abbondanti scaglie di grana. Servi immediatamente.'
        ], 
        sourceUrl: 'https://ricette.giallozafferano.it/Straccetti-di-manzo-rucola-e-grana.html', 
        imageUrl: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l10', 
        name: 'Omelette Zucchine e Formaggio', 
        type: 'lunch', 
        baseCalories: 380, 
        macros: { protein: 25, carbs: 5, fat: 28 }, 
        ingredients: [
            { name: 'Uova', amount: 3, unit: 'pz', category: 'Latticini' }, 
            { name: 'Zucchine', amount: 150, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Formaggio a fette (tipo edamer o provola)', amount: 40, unit: 'g', category: 'Latticini' }, 
            { name: 'Olio d\'oliva', amount: 10, unit: 'ml', category: 'Dispensa' }
        ], 
        instructions: [
            'Grattugia le zucchine a fori larghi, salale leggermente e strizzale per togliere l\'acqua in eccesso.', 
            'In una ciotola, sbatti vigorosamente le uova con sale, pepe e due cucchiai di formaggio grattugiato.', 
            'Scalda l\'olio in una padella antiaderente di circa 24cm, versa le uova e distribuiscile su tutto il fondo.', 
            'Quando la base dell\'omelette si rapprende ma la superficie è ancora umida, aggiungi le zucchine e le fette di formaggio su metà dell\'omelette.', 
            'Ripiega l\'altra metà sopra al ripieno formando una mezzaluna, copri con un coperchio per 1 minuto per far fondere il formaggio e servi.'
        ], 
        sourceUrl: 'https://www.cucchiaio.it/ricetta/omelette-alle-zucchine-e-formaggio/', 
        imageUrl: 'https://images.unsplash.com/photo-1510693064432-8dfdb04d3e8e?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 'l11', 
        name: 'Pasta Integrale Tonno e Limone', 
        type: 'lunch', 
        baseCalories: 480, 
        macros: { protein: 28, carbs: 65, fat: 12 }, 
        ingredients: [
            { name: 'Spaghetti o Penne integrali', amount: 80, unit: 'g', category: 'Dispensa' }, 
            { name: 'Tonno in scatola (al naturale)', amount: 120, unit: 'g', category: 'Dispensa' }, 
            { name: 'Limone (succo e scorza)', amount: 0.5, unit: 'pz', category: 'Ortofrutta' }, 
            { name: 'Prezzemolo tritato', amount: 10, unit: 'g', category: 'Ortofrutta' }
        ], 
        instructions: [
            'Metti a bollire l\'acqua per la pasta, salala e cala il formato integrale scelto.', 
            'In una ciotola capiente, sgrana il tonno con una forchetta. Aggiungi il succo di mezzo limone, la buccia grattugiata (solo la parte gialla), pepe e olio extravergine.', 
            'Aggiungi al tonno due cucchiai di acqua di cottura della pasta, per creare una sorta di "cremina".', 
            'Scola la pasta al dente e versala direttamente nella ciotola con il tonno.', 
            'Mescola bene, spolvera con abbondante prezzemolo fresco tritato e servi.'
        ], 
        sourceUrl: 'https://www.casapappagallo.it/ricette/primi/pasta-al-tonno-e-limone', 
        imageUrl: 'https://images.unsplash.com/photo-1626844131082-256783844137?auto=format&fit=crop&w=600&q=80' 
    },

    // === SPUNTINI ===

    { 
        id: 's1', 
        name: 'Hummus di Ceci con Bastoncini di Carote', 
        type: 'snack', 
        baseCalories: 210, 
        macros: { protein: 7, carbs: 20, fat: 12 }, 
        ingredients: [
            { name: 'Ceci precotti', amount: 80, unit: 'g', category: 'Dispensa' }, 
            { name: 'Crema Tahina', amount: 10, unit: 'g', category: 'Dispensa' }, 
            { name: 'Carote', amount: 150, unit: 'g', category: 'Ortofrutta' },
            { name: 'Succo di limone', amount: 5, unit: 'ml', category: 'Ortofrutta' }
        ], 
        instructions: [
            'In un frullatore, inserisci i ceci precotti sgocciolati, la crema tahina (crema di sesamo), un cucchiaio di succo di limone e un pizzico di sale.', 
            'Frulla il tutto aggiungendo gradualmente un paio di cucchiai di acqua calda o olio d\'oliva fino a ottenere una crema liscia e vellutata.', 
            'Pela le carote e tagliale per il lungo a formare dei bastoncini (stick).', 
            'Servi l\'hummus in una ciotolina e usa i bastoncini di carota per intingerli nella crema.'
        ], 
        sourceUrl: 'https://www.fattoincasadabenedetta.it/ricetta/hummus-di-ceci/', 
        imageUrl: 'https://images.unsplash.com/photo-1577047248881-807e3e9d897a?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 's2', 
        name: 'Frullato Proteico Banana e Burro di Arachidi', 
        type: 'snack', 
        baseCalories: 280, 
        macros: { protein: 12, carbs: 35, fat: 12 }, 
        ingredients: [
            { name: 'Banana matura', amount: 1, unit: 'pz', category: 'Ortofrutta' }, 
            { name: 'Burro di arachidi 100%', amount: 20, unit: 'g', category: 'Dispensa' }, 
            { name: 'Latte intero o vegetale', amount: 200, unit: 'ml', category: 'Latticini' }
        ], 
        instructions: [
            'Sbuccia la banana. Se hai tempo, tagliarla a rondelle e congelarla in anticipo renderà il frullato più cremoso e fresco.', 
            'Inserisci nel boccale del frullatore la banana, il latte e un cucchiaio abbondante di burro di arachidi puro.', 
            'Frulla alla massima velocità per circa un minuto, finché tutti gli ingredienti non si fondono in una bevanda omogenea e spumosa.', 
            'Versa in un bel bicchiere capiente e bevi subito per approfittare di tutte le vitamine.'
        ], 
        sourceUrl: 'https://www.cucchiaio.it/ricetta/smoothie-banana-e-burro-di-arachidi/', 
        imageUrl: 'https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=600&q=80' 
    },
    { 
        id: 's3', 
        name: 'Bruschetta Pomodorini e Basilico', 
        type: 'snack', 
        baseCalories: 180, 
        macros: { protein: 5, carbs: 25, fat: 6 }, 
        ingredients: [
            { name: 'Pane casereccio', amount: 1, unit: 'fetta', category: 'Panetteria' }, 
            { name: 'Pomodorini pachino', amount: 100, unit: 'g', category: 'Ortofrutta' }, 
            { name: 'Basilico fresco', amount: 3, unit: 'foglie', category: 'Ortofrutta' },
            { name: 'Olio extravergine', amount: 5, unit: 'ml', category: 'Dispensa' }
        ], 
        instructions: [
            'Lava i pomodorini e tagliali a pezzettini molto piccoli. Raccoglili in una ciotola.', 
            'Condisci i pomodorini con sale, foglie di basilico spezzettate a mano e un cucchiaino d\'olio d\'oliva. Lascia insaporire per 10 minuti.', 
            'Tosta la fetta di pane casereccio su una griglia o nel tostapane finché non è ben dorata.', 
            'Se lo desideri, strofina delicatamente mezzo spicchio d\'aglio sul pane caldo.', 
            'Adagia i pomodorini conditi sopra la fetta di pane bruschettato. Il sughetto ammorbidirà leggermente il pane, rendendolo perfetto.'
        ], 
        sourceUrl: 'https://ricette.giallozafferano.it/Bruschette-al-pomodoro.html', 
        imageUrl: 'https://images.unsplash.com/photo-1596644265780-60b5e2849202?auto=format&fit=crop&w=600&q=80' 
    }
];

// Estrazione ricette uniche per generazione dinamica
const breakfastsDB = recipesDB.filter(r => r.type === 'breakfast');
const lunchesDB    = recipesDB.filter(r => r.type === 'lunch');
const snacksDB     = recipesDB.filter(r => r.type === 'snack');

// Fallback in caso di mancanza
if(breakfastsDB.length === 0) breakfastsDB.push(recipesDB[0]);
if(lunchesDB.length === 0) lunchesDB.push(recipesDB[0]);
if(snacksDB.length === 0) snacksDB.push(recipesDB[0]);
