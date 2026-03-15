/**
 * Test getReportTemplate (Phase 2.4) - senza HTTP, solo service
 * node backend/scripts/test-resolve-template.js
 */
require('dotenv').config();
const { getReportTemplate } = require('../src/services/reportTemplate.service');

async function main() {
  console.log('Test getReportTemplate(1, 1, null)...');
  const t = await getReportTemplate(1, 1, null);
  console.log('  ->', t.name, t.file_path);

  console.log('\nTest getReportTemplate(1, 2, null)...');
  const t2 = await getReportTemplate(1, 2, null);
  console.log('  ->', t2.name, t2.file_path);

  console.log('\nTest getReportTemplate(1, 6, null)...');
  const t3 = await getReportTemplate(1, 6, null);
  console.log('  ->', t3.name, t3.file_path);

  console.log('\nOK');
}

main().catch((e) => {
  console.error('Errore:', e.message);
  process.exit(1);
});
