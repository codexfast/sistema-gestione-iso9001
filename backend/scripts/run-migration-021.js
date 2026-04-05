require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');

sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {
    console.log('Connesso al DB. Esecuzione migration 021...\n');

    // --- PARTE 1: logo_url su companies ---
    const hasLogo = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='companies' AND COLUMN_NAME='logo_url'`);
    if (hasLogo.recordset.length === 0) {
        await pool.request().query(`ALTER TABLE companies ADD logo_url NVARCHAR(500) NULL`);
        console.log('[OK] Colonna logo_url aggiunta a companies');
    } else {
        console.log('[--] Colonna logo_url gia presente');
    }

    // --- PARTE 2: Standard ISO 3834-2 ---
    const hasStd = await pool.request().query(`SELECT standard_id FROM standards WHERE standard_code='ISO_3834_2'`);
    let stdId;
    if (hasStd.recordset.length === 0) {
        const ins = await pool.request().query(`
            INSERT INTO standards (standard_code, standard_name, standard_full_name, version, category, is_active, description, created_at)
            OUTPUT INSERTED.standard_id
            VALUES ('ISO_3834_2','ISO 3834-2:2021','Requisiti di qualita per la saldatura per fusione - Parte 2: Requisiti completi','2021','quality',1,'Requisiti di qualita per la saldatura per fusione dei materiali metallici - Parte 2: Requisiti completi',GETDATE())
        `);
        stdId = ins.recordset[0].standard_id;
        console.log('[OK] Standard ISO 3834-2 inserito con id=' + stdId);
    } else {
        stdId = hasStd.recordset[0].standard_id;
        console.log('[--] Standard ISO 3834-2 gia presente con id=' + stdId);
    }

    // --- PARTE 3: Sezioni ---
    const sections = [
        { code: '3834_s1', title: "GESTIONE QUALITA'",      order: 1 },
        { code: '3834_s2', title: 'CONTROLLO DOCUMENTALE',  order: 2 },
        { code: '3834_s3', title: 'ISPEZIONE IN CAMPO',     order: 3 },
        { code: '3834_s4', title: 'CONTROLLI POST-SALDATURA', order: 4 },
    ];
    for (const sec of sections) {
        const exists = await pool.request().query(`SELECT 1 FROM checklist_sections WHERE standard_id=${stdId} AND section_code='${sec.code}'`);
        if (exists.recordset.length === 0) {
            await pool.request().query(`
                INSERT INTO checklist_sections (standard_id, section_code, section_title, parent_section_code, display_order, is_active, created_at)
                VALUES (${stdId}, '${sec.code}', N'${sec.title.replace("'","''")}', NULL, ${sec.order}, 1, GETDATE())
            `);
            console.log('[OK] Sezione ' + sec.code + ' inserita');
        } else {
            console.log('[--] Sezione ' + sec.code + ' gia presente');
        }
    }

    // --- PARTE 4: Domande ---
    const questions = [
        // GESTIONE QUALITA'
        { sec: '3834_s1', order: 10,  text: "Il fornitore e in possesso di certificazione UNI EN ISO 9001?" },
        { sec: '3834_s1', order: 20,  text: "Qualora il fornitore sia certificato ISO 3834, si effettua un corretto riesame dei requisiti contrattuali?" },
        { sec: '3834_s1', order: 30,  text: "Vengono subappaltate alcune attivita (saldatura, ispezione, controlli non distruttivi, trattamenti termici)?" },
        { sec: '3834_s1', order: 40,  text: "E stato stabilito un criterio di accettabilita per il prodotto saldato tra le parti?" },
        { sec: '3834_s1', order: 50,  text: "Il fornitore ha preparato il PPAP (o documentazione equivalente) in accordo alle specifiche del committente?" },
        { sec: '3834_s1', order: 60,  text: "Come vengono gestite le eventuali non conformita?" },
        // CONTROLLO DOCUMENTALE
        { sec: '3834_s2', order: 70,  text: "La rintracciabilita del materiale e garantita? I certificati vengono gestiti secondo EN ISO 10204?" },
        { sec: '3834_s2', order: 80,  text: "E presente un coordinatore di saldatura qualificato (IWE/IWT/IWS/IWP)?" },
        { sec: '3834_s2', order: 90,  text: "I saldatori e gli operatori di saldatura (WQ) sono qualificati per le attivita richieste?" },
        { sec: '3834_s2', order: 100, text: "I procedimenti di saldatura (WPQR) sono correttamente qualificati secondo la norma applicabile?" },
        { sec: '3834_s2', order: 110, text: "Sono presenti specifiche di procedimento di saldatura (WPS) applicabili ai componenti in lavorazione?" },
        { sec: '3834_s2', order: 120, text: "Il personale addetto alle prove non distruttive (CND/NDT) e qualificato secondo EN ISO 9712 o equivalente?" },
        // ISPEZIONE IN CAMPO
        { sec: '3834_s3', order: 130, text: "Il fornitore possiede attrezzature adeguate per la saldatura? Sono manutenute e i parametri di voltaggio/corrente controllati periodicamente?" },
        { sec: '3834_s3', order: 140, text: "Sono disponibili i disegni tecnici e le specifiche nelle aree di saldatura?" },
        { sec: '3834_s3', order: 150, text: "Viene effettuato il controllo della pulizia del pezzo prima della saldatura?" },
        { sec: '3834_s3', order: 160, text: "Le maschere di saldatura sono monitorate dimensionalmente e validate per i componenti in produzione?" },
        { sec: '3834_s3', order: 170, text: "La puntatura del pezzo e gestita con personale dedicato e qualificato? Esistono istruzioni operative specifiche?" },
        { sec: '3834_s3', order: 180, text: "Le eventuali riparazioni vengono registrate? Esistono WPS dedicate alle riparazioni?" },
        { sec: '3834_s3', order: 190, text: "Le condizioni di stoccaggio del Materiale Base, Materiale di Apporto e Gas risultano adeguate?" },
        // CONTROLLI POST-SALDATURA
        { sec: '3834_s4', order: 200, text: "Sono eseguiti e registrati Controlli Non Distruttivi (CND/NDT)? Quali tipologie e con quale estensione?" },
        { sec: '3834_s4', order: 210, text: "Si eseguono controlli dimensionali del prodotto saldato in accordo ai disegni contrattuali? E disponibile il relativo rapporto dimensionale?" },
        { sec: '3834_s4', order: 220, text: "E prevista e correttamente eseguita la marcatura del prodotto saldato finito?" },
    ];

    const existingQ = await pool.request().query(`SELECT COUNT(*) AS n FROM checklist_questions WHERE standard_id=${stdId}`);
    if (existingQ.recordset[0].n === 0) {
        let inserted = 0;
        for (const q of questions) {
            const req = pool.request();
            req.input('stdId', sql.Int, stdId);
            req.input('sec', sql.NVarChar, q.sec);
            req.input('text', sql.NVarChar, q.text);
            req.input('order', sql.Int, q.order);
            await req.query(`
                INSERT INTO checklist_questions (standard_id, section_code, question_text, question_type, display_order, is_mandatory, is_active, created_at, updated_at)
                VALUES (@stdId, @sec, @text, 'text', @order, 1, 1, GETDATE(), GETDATE())
            `);
            inserted++;
        }
        console.log('[OK] ' + inserted + ' domande ISO 3834-2 inserite');
    } else {
        console.log('[--] Domande ISO 3834-2 gia presenti (' + existingQ.recordset[0].n + ')');
    }

    // --- VERIFICA FINALE ---
    console.log('\n=== VERIFICA FINALE ===');
    const verify = await pool.request().query(`
        SELECT cs.section_code, cs.section_title, COUNT(q.question_id) AS domande
        FROM checklist_sections cs
        LEFT JOIN checklist_questions q ON q.section_code = cs.section_code AND q.standard_id = ${stdId} AND q.is_active = 1
        WHERE cs.standard_id = ${stdId}
        GROUP BY cs.section_code, cs.section_title, cs.display_order
        ORDER BY cs.display_order
    `);
    verify.recordset.forEach(r => console.log(`  ${r.section_code} | ${r.section_title.padEnd(28)} | ${r.domande} domande`));

    const logoOk = await pool.request().query(`SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='companies' AND COLUMN_NAME='logo_url'`);
    console.log(`  logo_url su companies: ${logoOk.recordset.length > 0 ? 'OK' : 'MANCANTE'}`);

    console.log('\n=== MIGRATION 021 COMPLETATA ===');
    await pool.close(); process.exit(0);
}).catch(e => { console.error('Errore:', e.message); process.exit(1); });
