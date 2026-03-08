/**
 * Migration 023 — Aggiunge standard RDP_MSN (Rapporto di Prova / Audit Fornitori Mason)
 * standard_id = 7
 * Idempotente: usa MERGE per non creare duplicati.
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8')).production;
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true }
}).then(async pool => {
    console.log('Connessione DB OK');

    // 1. Controlla se esiste già
    const exists = await pool.request().query(`SELECT standard_id FROM standards WHERE standard_code = 'RDP_MSN'`);
    if (exists.recordset.length > 0) {
        console.log(`ℹ️ RDP_MSN già presente con ID ${exists.recordset[0].standard_id} — skip insert`);
    } else {
        // Usa una singola request per SET + INSERT (stessa connessione)
        const req = pool.request();
        await req.batch(`
            SET IDENTITY_INSERT standards ON;
            INSERT INTO standards (standard_id, standard_code, standard_name, standard_full_name, version, category, is_active, description)
            VALUES (
                7,
                'RDP_MSN',
                'Rapporto di Prova / Audit Fornitori (ISO 3834)',
                'Checklist In Campo per Audit Fornitori — Requisiti qualita saldatura (Mason Srl)',
                '2021',
                'quality',
                1,
                'Checklist operativa per audit fornitori in campo. Verifica la conformita ai requisiti ISO 3834-2 per la qualita nella saldatura per fusione, applicata da Mason Srl nelle ispezioni di seconda parte.'
            );
            SET IDENTITY_INSERT standards OFF;
        `);
        console.log('✅ Standard RDP_MSN (id=7) inserito');
    }

    // 2. Verifica stato finale
    const result = await pool.request().query(`SELECT standard_id, standard_code, standard_name FROM standards ORDER BY standard_id`);
    console.log('\nStandard attivi nel DB:');
    result.recordset.forEach(s => console.log(`  ID:${s.standard_id}  ${s.standard_code}  —  ${s.standard_name}`));

    await pool.close();
    console.log('\n✅ Migration 023 completata');
    process.exit(0);
}).catch(e => { console.error('❌ Errore:', e.message); process.exit(1); });
