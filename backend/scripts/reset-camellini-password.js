/**
 * Script: Reset password Marco Camellini
 * Uso: node scripts/reset-camellini-password.js
 * Esegue da backend/ con NODE_ENV=production (o come configurato)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const fs = require('fs');

async function resetPassword() {
    const email = 'marcocamellini@gmail.com';
    const newPassword = 'Camellini2026!';

    try {
        // Usa la stessa config del backend
        const configPath = path.join(__dirname, '..', 'config', 'database.json');
        const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const env = process.env.NODE_ENV || 'production';
        let dbConfig = configs[env] || configs.production;

        if (env === 'production' && process.env.DB_SERVER) {
            dbConfig = { ...dbConfig, server: process.env.DB_SERVER, port: parseInt(process.env.DB_PORT) || dbConfig.port, database: process.env.DB_DATABASE || dbConfig.database, user: process.env.DB_USER || dbConfig.user, password: process.env.DB_PASSWORD || dbConfig.password };
        }

        const sql = require('mssql');
        const config = {
            server: dbConfig.server,
            port: dbConfig.port || 1433,
            database: dbConfig.database,
            user: dbConfig.user,
            password: dbConfig.password,
            options: { ...(dbConfig.options || {}), trustServerCertificate: true, encrypt: true }
        };

        console.log('🔧 Connessione al database...');
        const pool = await sql.connect(config);
        console.log('✅ Connesso\n');

        const check = await pool.request().input('email', sql.NVarChar, email).query('SELECT user_id, email, full_name FROM users WHERE email = @email');
        if (check.recordset.length === 0) {
            console.log('❌ Utente non trovato:', email);
            process.exit(1);
        }

        const hash = bcrypt.hashSync(newPassword, 10);
        await pool.request()
            .input('hash', sql.NVarChar, hash)
            .input('email', sql.NVarChar, email)
            .query('UPDATE users SET password_hash = @hash, updated_at = GETDATE() WHERE email = @email');

        console.log('✅ Password aggiornata per', email);
        console.log('   Password:', newPassword);
        await pool.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Errore:', err.message);
        process.exit(1);
    }
}

resetPassword();
