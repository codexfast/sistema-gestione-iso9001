/**
 * Test Database Connection
 * Script per verificare la connessione a SQL Server
 */

const { getPool, healthCheck, query } = require('./src/config/database');

async function testConnection() {
    console.log('🔌 Test connessione database...\n');

    try {
        // Test 1: Health check
        console.log('1️⃣ Health Check...');
        const health = await healthCheck();
        console.log(`   ✅ ${health.message}\n`);

        // Test 2: Query versione SQL Server
        console.log('2️⃣ Versione SQL Server...');
        const versionResult = await query('SELECT @@VERSION AS version');
        console.log(`   ✅ ${versionResult.recordset[0].version.split('\n')[0]}\n`);

        // Test 3: Verifica database SGQ_ISO9001
        console.log('3️⃣ Database SGQ_ISO9001...');
        const dbResult = await query("SELECT name, database_id FROM sys.databases WHERE name = 'SGQ_ISO9001'");
        if (dbResult.recordset.length > 0) {
            console.log(`   ✅ Database SGQ_ISO9001 trovato (ID: ${dbResult.recordset[0].database_id})\n`);
        } else {
            console.log('   ❌ Database SGQ_ISO9001 non trovato\n');
        }

        // Test 4: Conta tabelle
        console.log('4️⃣ Tabelle nel database...');
        const tablesResult = await query(`
      SELECT COUNT(*) as table_count 
      FROM SGQ_ISO9001.INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);
        console.log(`   ✅ Trovate ${tablesResult.recordset[0].table_count} tabelle\n`);

        // Test 5: Conta sezioni ISO 9001
        console.log('5️⃣ Sezioni ISO 9001:2015...');
        const sectionsResult = await query(`
      SELECT COUNT(*) as section_count 
      FROM SGQ_ISO9001.dbo.checklist_sections
    `);
        console.log(`   ✅ Trovate ${sectionsResult.recordset[0].section_count} sezioni\n`);

        // Test 6: Utente amministratore
        console.log('6️⃣ Utente amministratore...');
        const userResult = await query(`
      SELECT email, full_name, role 
      FROM SGQ_ISO9001.dbo.users 
      WHERE role = 'admin'
    `);
        if (userResult.recordset.length > 0) {
            const admin = userResult.recordset[0];
            console.log(`   ✅ ${admin.full_name} (${admin.email}) - Ruolo: ${admin.role}\n`);
        }

        console.log('========================================');
        console.log('🎉 TUTTI I TEST COMPLETATI CON SUCCESSO');
        console.log('========================================\n');
        console.log('✅ Database operativo e pronto per l\'uso!');
        console.log('✅ Puoi avviare il backend: npm start\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERRORE TEST:', error.message);
        console.error('\n📋 Stack trace:', error.stack);
        process.exit(1);
    }
}

// Esegui test
testConnection();
