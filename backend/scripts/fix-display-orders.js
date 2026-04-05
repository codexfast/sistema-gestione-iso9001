/**
 * Fix display_order ISO 9001 per rispettare numerazione norma.
 * Riordina le domande con clauseRef corretti e display_order univoci.
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');

// Ordine corretto con clauseRef norma ISO 9001:2015
// question_id → display_order (univoco per tutto lo standard)
const ORDER_MAP = [
    // clause4
    { id: 87,  ord: 1  },  // 4.1
    { id: 88,  ord: 2  },  // 4.2
    { id: 89,  ord: 3  },  // 4.3
    { id: 90,  ord: 4  },  // 4.4
    // clause5
    { id: 91,  ord: 5  },  // 5.1
    { id: 92,  ord: 6  },  // 5.2.1
    { id: 93,  ord: 7  },  // 5.2.2
    { id: 94,  ord: 8  },  // 5.3
    // clause6
    { id: 95,  ord: 9  },  // 6.1
    { id: 96,  ord: 10 },  // 6.2
    { id: 191, ord: 11 },  // 6.3 (nuovo)
    // clause7 — ordine corretto con nuovi
    { id: 192, ord: 12 },  // 7.1.1 Generalità (nuovo)
    { id: 97,  ord: 13 },  // 7.1.2 Persone
    { id: 98,  ord: 14 },  // 7.1.3 Infrastruttura
    { id: 99,  ord: 15 },  // 7.1.4 Ambiente
    { id: 100, ord: 16 },  // 7.1.5.1 M&M Generalità
    { id: 101, ord: 17 },  // 7.1.5.2 Riferibilità metrologica
    { id: 193, ord: 18 },  // 7.1.6 Conoscenza organizzativa (nuovo)
    { id: 102, ord: 19 },  // 7.2 Competenza
    { id: 103, ord: 20 },  // 7.3 Consapevolezza
    { id: 104, ord: 21 },  // 7.4 Comunicazione
    { id: 105, ord: 22 },  // 7.5 Informazioni documentate
    // clause8
    { id: 106, ord: 23 },  // 8.2.2 Requisiti
    { id: 107, ord: 24 },  // 8.2.3 Riesame
    { id: 108, ord: 25 },  // 8.3 Progettazione
    { id: 109, ord: 26 },  // 8.4 Fornitura esterna
    { id: 110, ord: 27 },  // 8.5.2 Rintracciabilità
    { id: 111, ord: 28 },  // 8.5.3 Proprietà cliente
    { id: 112, ord: 29 },  // 8.5.5 Post-vendita
    { id: 113, ord: 30 },  // 8.5.6 Modifiche
    { id: 114, ord: 31 },  // 8.6 Rilascio
    { id: 115, ord: 32 },  // 8.7 NC
    // clause9
    { id: 116, ord: 33 },  // 9.1 Monitoraggio KPI
    { id: 117, ord: 34 },  // 9.1.2 Customer satisfaction
    { id: 118, ord: 35 },  // 9.2 Audit interno
    { id: 119, ord: 36 },  // 9.3 Riesame di direzione
    // clause10
    { id: 120, ord: 37 },  // 10.2 NC + Azioni correttive
    { id: 121, ord: 38 },  // 10.3 Miglioramento continuo
];

sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {
    console.log('Aggiornamento display_order ISO 9001...\n');
    for (const { id, ord } of ORDER_MAP) {
        await pool.request().query(`UPDATE checklist_questions SET display_order=${ord}, updated_at=GETDATE() WHERE question_id=${id} AND standard_id=1`);
        process.stdout.write(`  #${id} → ord:${ord}\n`);
    }
    console.log('\n[OK] display_order aggiornati. Verifica:');
    const check = await pool.request().query(`
        SELECT question_id, section_code, display_order, LEFT(question_text,50) as testo
        FROM checklist_questions WHERE standard_id=1 AND is_active=1
        ORDER BY display_order
    `);
    check.recordset.forEach(r => console.log(`  ord:${String(r.display_order).padStart(2)} #${r.question_id} [${r.section_code}] ${r.testo}`));
    await pool.close(); process.exit(0);
}).catch(e => { console.error('Errore:', e.message); process.exit(1); });
