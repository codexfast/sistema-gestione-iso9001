/**
 * Migration 024: Aggiunge colonna norm_excerpt a checklist_questions
 * - norm_excerpt NVARCHAR(MAX) NULL  → stralcio normativo da stampare nel report Word
 * - Idempotente: salta se la colonna esiste già
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {
    ...c,
    server:   process.env.DB_SERVER,
    database: process.env.DB_DATABASE || c.database,
    user:     process.env.DB_USER     || c.user,
    password: process.env.DB_PASSWORD || c.password,
};
const sql = require('mssql');

sql.connect({
    server: c.server, port: c.port || 1433, database: c.database,
    user: c.user, password: c.password,
    options: { trustServerCertificate: true, encrypt: true },
}).then(async pool => {
    console.log('Migration 024: aggiunta colonna norm_excerpt...\n');

    // Verifica se la colonna esiste già
    const exists = await pool.request().query(`
        SELECT COUNT(*) AS n
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'checklist_questions'
          AND COLUMN_NAME = 'norm_excerpt'
    `);

    if (exists.recordset[0].n > 0) {
        console.log('[--] Colonna norm_excerpt già presente, nessuna azione.');
    } else {
        await pool.request().query(`
            ALTER TABLE checklist_questions
            ADD norm_excerpt NVARCHAR(MAX) NULL
        `);
        console.log('[OK] Colonna norm_excerpt aggiunta a checklist_questions.');
    }

    // Verifica finale
    const check = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'checklist_questions' AND COLUMN_NAME = 'norm_excerpt'
    `);
    console.log('\nStato colonna:', check.recordset[0]);
    console.log('\n✅ Migration 024 completata.');
    await pool.close();
    process.exit(0);
}).catch(e => {
    console.error('Errore:', e.message);
    process.exit(1);
});
