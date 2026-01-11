/**
 * Script: Reset Admin Password
 * Uso: node scripts/reset-admin-password.js
 */

const bcrypt = require('bcryptjs');
const sql = require('mssql');

// Config database - Windows Authentication
const config = {
    server: 'localhost',
    database: 'SGQ_ISO9001',
    options: {
        trustServerCertificate: true,
        enableArithAbort: true,
        encrypt: false,
        trustedConnection: true  // Windows Auth
    }
};

async function resetPassword() {
    const newPassword = 'Admin2025!';
    const email = 'admin@sgq.local';

    try {
        console.log('🔧 Connessione al database...');
        const pool = await sql.connect(config);

        console.log(`🔐 Generazione hash per password: ${newPassword}`);
        const passwordHash = await bcrypt.hash(newPassword, 10);

        console.log(`📝 Aggiornamento password per utente: ${email}`);
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('passwordHash', sql.NVarChar, passwordHash)
            .query(`
                UPDATE users
                SET password_hash = @passwordHash,
                    updated_at = GETDATE()
                WHERE email = @email
            `);

        if (result.rowsAffected[0] > 0) {
            console.log('✅ Password aggiornata con successo!');
            console.log('');
            console.log('📋 Credenziali admin:');
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${newPassword}`);
            console.log('');
            console.log('🧪 Test login PowerShell:');
            console.log(`   $login = Invoke-RestMethod -Uri "http://localhost:10443/api/v1/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"${email}","password":"${newPassword}"}'`);
        } else {
            console.log(`❌ Utente ${email} non trovato nel database`);
        }

        await pool.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Errore:', error.message);
        process.exit(1);
    }
}

resetPassword();
