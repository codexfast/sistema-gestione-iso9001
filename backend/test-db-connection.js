/**
 * Test Connessione Database SQL Server
 * Verifica se il backend riesce a connettersi al database
 */

const sql = require('mssql');

// Configurazione database (stessi parametri di database.json)
const config = {
    server: 'www.fr-busato.it',
    port: 11043,
    database: 'SGQ_ISO9001',
    user: 'pascarella',
    password: '#Gestione2025@',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
    },
};

async function testConnection() {
    console.log('============================================');
    console.log('TEST CONNESSIONE DATABASE SQL SERVER');
    console.log('============================================\n');

    console.log('Configurazione:');
    console.log(`  Server: ${config.server}:${config.port}`);
    console.log(`  Database: ${config.database}`);
    console.log(`  User: ${config.user}\n`);

    console.log('Tentativo connessione...');

    try {
        // Test connessione
        const pool = await sql.connect(config);
        console.log('✅ CONNESSIONE RIUSCITA!\n');

        // Test query: conta audit
        console.log('Esecuzione query di test...');
        const result = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM audits) as total_audits,
        (SELECT COUNT(*) FROM checklist_questions WHERE standard_id = 1) as total_questions,
        (SELECT COUNT(*) FROM checklist_sections WHERE standard_id = 1) as total_sections
    `);

        console.log('✅ QUERY ESEGUITA CON SUCCESSO!\n');
        console.log('Risultati:');
        console.log(`  - Audit nel database: ${result.recordset[0].total_audits}`);
        console.log(`  - Domande ISO 9001: ${result.recordset[0].total_questions}`);
        console.log(`  - Sezioni ISO 9001: ${result.recordset[0].total_sections}\n`);

        // Chiudi connessione
        await pool.close();
        console.log('✅ TEST COMPLETATO - Database funzionante!\n');
        console.log('============================================');
        process.exit(0);

    } catch (err) {
        console.error('❌ ERRORE CONNESSIONE:\n');
        console.error('Messaggio:', err.message);
        console.error('Codice:', err.code);
        console.error('\nDettagli completi:');
        console.error(err);
        console.log('\n============================================');
        console.log('TROUBLESHOOTING:\n');
        console.log('1. Verifica che SQL Server sia accessibile da questo PC');
        console.log('   - Prova: telnet www.fr-busato.it 11043');
        console.log('2. Verifica firewall del server SQL');
        console.log('3. Verifica credenziali (user/password)');
        console.log('4. Verifica che il database SGQ_ISO9001 esista');
        console.log('============================================\n');
        process.exit(1);
    }
}

// Esegui test
testConnection();
