/**
 * Diagnostica visibilità audit per utente specifico
 * Verifica perché un audit non compare per un determinato account
 */
require('dotenv').config();
const fs = require('fs'), path = require('path');
const configs = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','database.json'),'utf8'));
let c = configs.production;
if (process.env.DB_SERVER) c = {...c, server:process.env.DB_SERVER, database:process.env.DB_DATABASE||c.database, user:process.env.DB_USER||c.user, password:process.env.DB_PASSWORD||c.password};
const sql = require('mssql');

sql.connect({server:c.server,port:c.port||1433,database:c.database,user:c.user,password:c.password,options:{trustServerCertificate:true,encrypt:true}}).then(async pool => {

    console.log('=== 1. UTENTE: Marco Camellini ===');
    const user = await pool.request().query(`
        SELECT user_id, username, email, role, auditor_org_id, organization_id, is_active
        FROM users WHERE username LIKE '%camellini%' OR email LIKE '%camellini%' OR username LIKE '%marco%'
    `);
    console.log(user.recordset.length ? JSON.stringify(user.recordset, null, 2) : '  [nessun utente trovato]');

    console.log('\n=== 2. AZIENDA: ERAM TECHNOLOGIES ===');
    const company = await pool.request().query(`
        SELECT * FROM companies WHERE name LIKE '%ERAM%' OR name LIKE '%eram%'
    `);
    console.log(company.recordset.length ? JSON.stringify(company.recordset, null, 2) : '  [nessuna azienda trovata]');

    console.log('\n=== 3. AUDIT collegati a ERAM (per client_name o company_id) ===');
    const audits = await pool.request().query(`
        SELECT a.audit_id, a.audit_number, a.client_name, a.company_id, a.status,
               a.organization_id, a.auditor_id, a.created_at,
               u.username as auditor_name, u.auditor_org_id
        FROM audits a
        LEFT JOIN users u ON a.auditor_id = u.user_id
        WHERE a.client_name LIKE '%ERAM%' OR a.client_name LIKE '%eram%'
           OR a.company_id IN (SELECT id FROM companies WHERE name LIKE '%ERAM%')
    `);
    console.log(audits.recordset.length ? JSON.stringify(audits.recordset, null, 2) : '  [nessun audit trovato]');

    if (user.recordset.length > 0 && audits.recordset.length > 0) {
        const uid = user.recordset[0].user_id;
        const uOrgId = user.recordset[0].auditor_org_id;
        const uOrgLegacy = user.recordset[0].organization_id;

        console.log('\n=== 4. ANALISI VISIBILITÀ ===');
        audits.recordset.forEach(a => {
            console.log(`\nAudit #${a.audit_id} (${a.audit_number}):`);
            console.log(`  client_name: ${a.client_name}`);
            console.log(`  organization_id audit: ${a.organization_id}  vs  utente organization_id: ${uOrgLegacy} → ${a.organization_id === uOrgLegacy ? '✅ MATCH' : '❌ MISMATCH'}`);
            console.log(`  auditor_id audit: ${a.auditor_id}  vs  user_id Camellini: ${uid} → ${a.auditor_id === uid ? '✅ MATCH' : '❌ MISMATCH'}`);
            console.log(`  auditor_org_id audit (via auditor): ${a.auditor_org_id}  vs  Camellini auditor_org_id: ${uOrgId} → ${a.auditor_org_id === uOrgId ? '✅ MATCH' : '❌ MISMATCH'}`);
        });
    }

    console.log('\n=== 5. TUTTI GLI AUDITOR (per identificare Marco Camellini) ===');
    const allUsers = await pool.request().query(`
        SELECT user_id, username, email, role, auditor_org_id, organization_id, is_active
        FROM users ORDER BY user_id
    `);
    allUsers.recordset.forEach(u => {
        console.log(`  [${u.user_id}] ${u.username} | ${u.email} | role:${u.role} | org_id:${u.organization_id} | aud_org_id:${u.auditor_org_id} | active:${u.is_active}`);
    });

    console.log('\n=== 6. TUTTI GLI AUDIT RECENTI (ultimi 10) ===');
    const recent = await pool.request().query(`
        SELECT TOP 10 a.audit_id, a.audit_number, a.client_name, a.status,
               a.organization_id, a.auditor_id, a.created_at
        FROM audits a ORDER BY a.created_at DESC
    `);
    recent.recordset.forEach(a => {
        console.log(`  [${a.audit_id}] ${a.audit_number} | ${a.client_name} | org:${a.organization_id} | auditor:${a.auditor_id} | ${a.status}`);
    });

    await pool.close(); process.exit(0);
}).catch(e => { console.error('Errore:', e.message); process.exit(1); });
