/**
 * TEST DIAGNOSTICO SINCRONIZZAZIONE
 * Eseguire in Console DevTools per verificare ogni step del flusso
 */

// ============================================================================
// TEST 1: INDEXEDDB - Verifica salvataggio locale audits
// ============================================================================
async function test1_IndexedDB() {
    console.log('🔍 TEST 1: Verifica IndexedDB audits store');

    try {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('sgq_iso_audits', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const tx = db.transaction(['audits'], 'readonly');
        const store = tx.objectStore('audits');
        const audits = await new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });

        console.log(`✅ Audits trovati: ${audits.length}`);
        console.table(audits.map(a => ({
            id: a.metadata?.id || a.id,
            uuid: a.audit_uuid?.substring(0, 13),
            client: a.client_name,
            completion: `${a.completion_percentage || 0}%`,
            answered: `${a.answered_questions || 0}/${a.total_questions || 78}`,
            updated: new Date(a.metadata?.lastModified || a.updated_at).toLocaleString('it-IT'),
            has_checklist: !!a.checklist,
            has_responses: !!a.responses
        })));

        // Verifica ultimo aggiornamento
        const mostRecent = audits.sort((a, b) =>
            new Date(b.metadata?.lastModified || b.updated_at) -
            new Date(a.metadata?.lastModified || a.updated_at)
        )[0];

        if (mostRecent) {
            const lastUpdate = new Date(mostRecent.metadata?.lastModified || mostRecent.updated_at);
            const minutesAgo = Math.floor((Date.now() - lastUpdate) / 60000);
            console.log(`⏰ Ultimo aggiornamento: ${minutesAgo} minuti fa (${lastUpdate.toLocaleTimeString('it-IT')})`);

            if (minutesAgo < 2) {
                console.log('✅ PASS: Audit aggiornato recentemente');
                return { status: 'PASS', audits: audits.length, lastUpdate: minutesAgo };
            } else {
                console.warn('⚠️ WARN: Ultimo aggiornamento > 2 minuti fa');
                return { status: 'WARN', audits: audits.length, lastUpdate: minutesAgo };
            }
        }

        db.close();
    } catch (error) {
        console.error('❌ FAIL: Errore IndexedDB:', error);
        return { status: 'FAIL', error: error.message };
    }
}

// ============================================================================
// TEST 2: SYNC_QUEUE - Verifica enqueue modifiche
// ============================================================================
async function test2_SyncQueue() {
    console.log('🔍 TEST 2: Verifica sync_queue store');

    try {
        const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('sgq_iso_audits', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        const tx = db.transaction(['sync_queue'], 'readonly');
        const store = tx.objectStore('sync_queue');
        const queue = await new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });

        console.log(`📊 Queue size: ${queue.length} items`);

        if (queue.length === 0) {
            console.warn('⚠️ WARN: Queue vuota - sync già completata o enqueue non funziona');
            return { status: 'WARN', queueSize: 0, message: 'Queue vuota' };
        }

        console.table(queue.map(q => ({
            type: q.type,
            audit_uuid: q.payload?.audit_uuid?.substring(0, 13) || 'N/A',
            audit_id: q.payload?.id || q.payload?.metadata?.id || 'N/A',
            client: q.payload?.client_name?.substring(0, 20) || 'N/A',
            timestamp: new Date(q.timestamp).toLocaleTimeString('it-IT'),
            retries: q.retryCount,
            error: q.lastError || '-'
        })));

        // Analisi queue
        const updateAudits = queue.filter(q => q.type === 'update_audit');
        const createAudits = queue.filter(q => q.type === 'create_audit');
        const saveResponses = queue.filter(q => q.type === 'save_responses');

        console.log(`📌 Update audits: ${updateAudits.length}`);
        console.log(`📌 Create audits: ${createAudits.length}`);
        console.log(`📌 Save responses: ${saveResponses.length}`);

        // Verifica payload completo
        if (updateAudits.length > 0) {
            const sample = updateAudits[0].payload;
            console.log('🔍 Sample payload update_audit:');
            console.log({
                audit_uuid: sample.audit_uuid,
                audit_number: sample.audit_number,
                client_name: sample.client_name,
                organization_id: sample.organization_id,
                completion_percentage: sample.completion_percentage,
                answered_questions: sample.answered_questions,
                has_updated_at: !!sample.updated_at,
                has_metadata: !!sample.metadata
            });

            // Check campi obbligatori
            const requiredFields = ['audit_uuid', 'audit_number', 'client_name'];
            const missingFields = requiredFields.filter(f => !sample[f]);

            if (missingFields.length > 0) {
                console.error(`❌ FAIL: Campi obbligatori mancanti:`, missingFields);
                return { status: 'FAIL', queueSize: queue.length, missingFields };
            }
        }

        console.log('✅ PASS: Queue popolata con payload validi');
        db.close();
        return { status: 'PASS', queueSize: queue.length, updateAudits: updateAudits.length };

    } catch (error) {
        console.error('❌ FAIL: Errore sync_queue:', error);
        return { status: 'FAIL', error: error.message };
    }
}

// ============================================================================
// TEST 3: AUTO-SYNC - Verifica polling attivo
// ============================================================================
function test3_AutoSync() {
    console.log('🔍 TEST 3: Verifica auto-sync polling (attendere 35 secondi)');
    console.log('⏳ Monitoraggio log console per 35 secondi...');

    let logCount = 0;
    const startTime = Date.now();

    // Intercetta console.log
    const originalLog = console.log;
    console.log = function (...args) {
        const message = args.join(' ');
        if (message.includes('[SYNC]') || message.includes('[AUTO-SYNC]')) {
            logCount++;
            console.warn(`📝 SYNC LOG #${logCount}:`, ...args);
        }
        originalLog.apply(console, args);
    };

    setTimeout(() => {
        console.log = originalLog; // Ripristina
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        console.log(`\n📊 RISULTATO TEST 3 (${elapsed}s):`);
        console.log(`   Log sync rilevati: ${logCount}`);

        if (logCount >= 1) {
            console.log('✅ PASS: Auto-sync attivo (log rilevati)');
            return { status: 'PASS', logCount, elapsed };
        } else {
            console.error('❌ FAIL: Auto-sync NON attivo (nessun log in 35s)');
            console.log('💡 DEBUG: Verificare StorageContext.jsx → initSyncAndPolling');
            console.log('💡 DEBUG: Verificare syncService.startAutoSync() chiamato');
            return { status: 'FAIL', logCount: 0, elapsed };
        }
    }, 35000);

    return { status: 'RUNNING', message: 'Attendere 35 secondi per risultato' };
}

// ============================================================================
// TEST 4: HTTP REQUEST - Verifica network call
// ============================================================================
async function test4_HttpRequest() {
    console.log('🔍 TEST 4: Verifica HTTP POST /audits/sync');
    console.log('⚠️ IMPORTANTE: Aprire DevTools → Network → Filtra "sync" PRIMA di eseguire');
    console.log('⏳ Monitoraggio per 40 secondi (1 ciclo auto-sync)...');

    // Intercetta fetch
    const originalFetch = window.fetch;
    let syncRequests = [];

    window.fetch = function (...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('/audits/sync')) {
            console.log('🌐 FETCH INTERCEPTED:', url);
            const request = originalFetch.apply(this, args);

            request.then(response => {
                console.log(`📡 Response /audits/sync:`, {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok
                });

                response.clone().json().then(data => {
                    console.log('📦 Response body:', data);
                    syncRequests.push({
                        url,
                        status: response.status,
                        action: data.action,
                        audit_id: data.audit_id
                    });
                });
            }).catch(error => {
                console.error('❌ Fetch error:', error);
                syncRequests.push({ url, error: error.message });
            });

            return request;
        }
        return originalFetch.apply(this, args);
    };

    setTimeout(() => {
        window.fetch = originalFetch; // Ripristina

        console.log(`\n📊 RISULTATO TEST 4:`);
        console.log(`   Requests /audits/sync: ${syncRequests.length}`);

        if (syncRequests.length > 0) {
            console.table(syncRequests);
            console.log('✅ PASS: HTTP request inviata');
            return { status: 'PASS', requests: syncRequests };
        } else {
            console.error('❌ FAIL: Nessuna HTTP request in 40s');
            console.log('💡 DEBUG: Verificare Test 2 (queue popolata?)');
            console.log('💡 DEBUG: Verificare Test 3 (auto-sync attivo?)');
            return { status: 'FAIL', requests: [] };
        }
    }, 40000);

    return { status: 'RUNNING', message: 'Attendere 40 secondi per risultato' };
}

// ============================================================================
// TEST 5: SQL WRITE - Verifica scrittura database
// ============================================================================
function test5_SqlWrite() {
    console.log('🔍 TEST 5: Verifica SQL Server write');
    console.log('⚠️ ESEGUIRE IN SSMS (SQL Server Management Studio):');
    console.log('\n--- QUERY PRIMA DEL TEST ---');
    console.log(`
SELECT COUNT(*) AS before_count 
FROM dbo.audits 
WHERE is_deleted = 0;

SELECT TOP 5 
  audit_id, 
  audit_number,
  client_name, 
  completion_percentage, 
  answered_questions,
  updated_at
FROM dbo.audits 
WHERE is_deleted = 0
ORDER BY updated_at DESC;
  `);

    console.log('\n⏳ 1. Eseguire query sopra in SSMS');
    console.log('⏳ 2. Annotare before_count');
    console.log('⏳ 3. Modificare checklist in UI');
    console.log('⏳ 4. Attendere 35 secondi (auto-sync)');
    console.log('⏳ 5. Rieseguire query in SSMS');

    console.log('\n--- VERIFICA DOPO SYNC ---');
    console.log('✅ PASS se:');
    console.log('   - after_count > before_count (nuovo audit)');
    console.log('   - OR updated_at cambiato per audit esistente');
    console.log('   - completion_percentage aggiornato');
    console.log('\n❌ FAIL se:');
    console.log('   - Count invariato E updated_at identico');
    console.log('   - Controllare backend logs per errori SQL');

    return {
        status: 'MANUAL',
        message: 'Eseguire query SSMS manualmente e confrontare risultati'
    };
}

// ============================================================================
// ESEGUI TUTTI I TEST IN SEQUENZA
// ============================================================================
async function runAllTests() {
    console.clear();
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║   TEST DIAGNOSTICO SINCRONIZZAZIONE AUDITS                ║');
    console.log('║   Sistema Gestione ISO 9001 - Offline-First Sync          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    const results = {};

    // Test 1: IndexedDB
    console.log('\n═══════════════════════════════════════════════════════════');
    results.test1 = await test1_IndexedDB();
    await new Promise(r => setTimeout(r, 2000)); // Pausa 2s

    // Test 2: Sync Queue
    console.log('\n═══════════════════════════════════════════════════════════');
    results.test2 = await test2_SyncQueue();
    await new Promise(r => setTimeout(r, 2000));

    // Test 3: Auto-sync (asincrono, 35s)
    console.log('\n═══════════════════════════════════════════════════════════');
    results.test3 = test3_AutoSync();

    // Test 4: HTTP (asincrono, 40s)
    console.log('\n═══════════════════════════════════════════════════════════');
    results.test4 = test4_HttpRequest();

    // Test 5: SQL (manuale)
    console.log('\n═══════════════════════════════════════════════════════════');
    results.test5 = test5_SqlWrite();

    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   SUMMARY RISULTATI TEST                                  ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('Test 1 (IndexedDB):  ', results.test1.status);
    console.log('Test 2 (Sync Queue): ', results.test2.status);
    console.log('Test 3 (Auto-sync):  ', 'RUNNING (attendere 35s)');
    console.log('Test 4 (HTTP):       ', 'RUNNING (attendere 40s)');
    console.log('Test 5 (SQL):        ', 'MANUAL (eseguire query SSMS)');

    console.log('\n💡 Per vedere risultati Test 3-4, attendere 40 secondi');
    console.log('💡 Per Test 5, eseguire query SQL in SSMS dopo sync\n');

    return results;
}

// ============================================================================
// ESPORTAZIONE FUNZIONI (disponibili in console)
// ============================================================================
window.syncTests = {
    runAll: runAllTests,
    test1: test1_IndexedDB,
    test2: test2_SyncQueue,
    test3: test3_AutoSync,
    test4: test4_HttpRequest,
    test5: test5_SqlWrite
};

console.log('✅ Diagnostic tests caricati');
console.log('📌 Per eseguire tutti i test: syncTests.runAll()');
console.log('📌 Per eseguire singolo test: syncTests.test1() ... syncTests.test5()');
