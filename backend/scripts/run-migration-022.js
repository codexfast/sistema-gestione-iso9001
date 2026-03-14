/**
 * Esegue migration 022 (user_standards) + seed Marco e Andrea
 * Da root progetto: node backend/scripts/run-migration-022.js
 */
require('dotenv').config();
const path = require('path');
const configs = require(path.join(__dirname, '..', 'config', 'database.json'));
let c = configs.production || configs.development;
if (process.env.DB_SERVER) {
  c = { ...c, server: process.env.DB_SERVER, database: process.env.DB_DATABASE || c.database, user: process.env.DB_USER || c.user, password: process.env.DB_PASSWORD || c.password };
}
const sql = require('mssql');

const config = {
  server: c.server,
  port: c.port || 1433,
  database: c.database,
  user: c.user,
  password: c.password,
  options: { trustServerCertificate: true, encrypt: true }
};

async function run() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('Connesso al DB. Esecuzione migration 022 (user_standards)...\n');

    const exists = await pool.request().query(
      "SELECT 1 FROM sys.tables WHERE name = 'user_standards'"
    );
    if (exists.recordset.length === 0) {
      await pool.request().query(`
        CREATE TABLE dbo.user_standards (
          user_id     INT NOT NULL,
          standard_id INT NOT NULL,
          created_at  DATETIME2 NOT NULL DEFAULT GETDATE(),
          CONSTRAINT PK_user_standards PRIMARY KEY CLUSTERED (user_id, standard_id),
          CONSTRAINT FK_user_standards_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
          CONSTRAINT FK_user_standards_standard FOREIGN KEY (standard_id) REFERENCES dbo.standards(standard_id)
        );
        CREATE NONCLUSTERED INDEX IX_user_standards_user ON dbo.user_standards(user_id);
        CREATE NONCLUSTERED INDEX IX_user_standards_standard ON dbo.user_standards(standard_id);
      `);
      console.log('[OK] Tabella user_standards creata');
    } else {
      console.log('[--] Tabella user_standards già presente');
    }

    console.log('\nSeed Marco e Andrea...');
    const marco = await pool.request().input('email', sql.NVarChar, 'marcocamellini@gmail.com').query('SELECT user_id FROM users WHERE email = @email');
    const andrea = await pool.request().input('email', sql.NVarChar, 'andrea.mason@mason-cs.com').query('SELECT user_id FROM users WHERE email = @email');

    if (marco.recordset.length > 0) {
      const mid = marco.recordset[0].user_id;
      for (const sid of [1, 2, 3]) {
        const r = await pool.request().input('user_id', sql.Int, mid).input('standard_id', sql.Int, sid)
          .query('IF NOT EXISTS (SELECT 1 FROM user_standards WHERE user_id = @user_id AND standard_id = @standard_id) INSERT INTO user_standards (user_id, standard_id) VALUES (@user_id, @standard_id)');
        if (r.rowsAffected[0] > 0) console.log('[OK] Marco: standard ' + sid);
      }
      console.log('[OK] Marco Camellini: 9001, 14001, 45001');
    } else {
      console.log('[--] Utente marcocamellini@gmail.com non trovato, skip seed Marco');
    }

    if (andrea.recordset.length > 0) {
      const aid = andrea.recordset[0].user_id;
      const r = await pool.request().input('user_id', sql.Int, aid).input('standard_id', sql.Int, 6)
        .query('IF NOT EXISTS (SELECT 1 FROM user_standards WHERE user_id = @user_id AND standard_id = @standard_id) INSERT INTO user_standards (user_id, standard_id) VALUES (@user_id, @standard_id)');
      if (r.rowsAffected[0] > 0) console.log('[OK] Andrea Mason: standard 6 (3834-2)');
      else console.log('[--] Andrea Mason: già assegnato 3834-2');
    } else {
      console.log('[--] Utente andrea.mason@mason-cs.com non trovato, skip seed Andrea');
    }

    console.log('\nMigration 022 + seed completati.');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

run();
