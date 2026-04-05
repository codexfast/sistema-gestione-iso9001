/**
 * Script ispezione utenti e gerarchia org per Fase 1
 * - Stampa elenco utenti (id, email, role, organization_id, auditor_org_id)
 * - Stampa auditor_orgs
 * - Stampa eventuale user_org_roles se presente
 *
 * Uso:
 *   NODE_ENV=production node backend/scripts/inspect-users-and-orgs.js
 */

const { getPool } = require('../src/config/database');

async function run() {
  const pool = await getPool();

  console.log('=== USERS ===');
  const users = await pool.request().query(`
    SELECT user_id, email, full_name, role, organization_id, auditor_org_id, is_active
    FROM users
    ORDER BY user_id
  `);
  console.table(users.recordset);

  console.log('\n=== AUDITOR_ORGS ===');
  const orgs = await pool.request().query(`
    IF OBJECT_ID('auditor_orgs', 'U') IS NOT NULL
      SELECT id, organization_id, name, email, subscription_plan, is_active
      FROM auditor_orgs
      ORDER BY id;
    ELSE
      SELECT CAST(NULL AS INT) AS id, CAST(NULL AS INT) AS organization_id, CAST(NULL AS NVARCHAR(200)) AS name,
             CAST(NULL AS NVARCHAR(200)) AS email, CAST(NULL AS NVARCHAR(50)) AS subscription_plan,
             CAST(NULL AS BIT) AS is_active
      WHERE 1 = 0;
  `);
  console.table(orgs.recordset);

  console.log('\n=== USER_ORG_ROLES (se esiste) ===');
  const roles = await pool.request().query(`
    IF OBJECT_ID('user_org_roles', 'U') IS NOT NULL
      SELECT user_id, org_id, role
      FROM user_org_roles
      ORDER BY user_id, org_id;
    ELSE
      SELECT CAST(NULL AS INT) AS user_id, CAST(NULL AS INT) AS org_id, CAST(NULL AS NVARCHAR(30)) AS role
      WHERE 1 = 0;
  `);
  console.table(roles.recordset);

  process.exit(0);
}

run().catch((err) => {
  console.error('Errore ispezione:', err);
  process.exit(1);
});

