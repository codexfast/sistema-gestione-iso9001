/**
 * Test connessione server
 */

const API_BASE = 'http://localhost:10443/api/v1';

async function testConnection() {
    try {
        console.log('🔍 Test connessione al server...\n');
        console.log(`   URL: ${API_BASE}/health (o qualsiasi endpoint)\n`);

        const resp = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@test.com',
                password: 'Test123!',
                full_name: 'Test User',
                role: 'auditor',
                organization_id: 1
            })
        });

        console.log(`   ✅ Server risponde! Status: ${resp.status}`);
        const data = await resp.json();
        console.log(`   📋 Risposta:`, JSON.stringify(data, null, 2));

    } catch (error) {
        console.error(`   ❌ Server non raggiungibile:`, error.message);
        console.error(`\n   Verifica che il server sia avviato con: npm run dev`);
        process.exit(1);
    }
}

testConnection();
