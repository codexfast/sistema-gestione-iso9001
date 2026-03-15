/**
 * Test API report-templates (Phase 2)
 * Richiede backend avviato.
 * Uso:
 *   TOKEN=<jwt> node backend/scripts/test-report-templates-api.js
 *   Oppure con login: EMAIL=admin@sgq.local PASSWORD=xxx node backend/scripts/test-report-templates-api.js
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:10443';
let TOKEN = process.env.TOKEN || process.argv[2];

const isHttps = API_BASE.startsWith('https');
const client = isHttps ? https : http;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    const req = client.request(url, opts, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login() {
  const email = process.env.EMAIL || 'admin@sgq.local';
  const password = process.env.PASSWORD;
  if (!password) return null;
  const res = await request('POST', '/api/v1/auth/login', { email, password });
  if (res.status === 200 && res.data?.data?.token) {
    return res.data.data.token;
  }
  return null;
}

async function main() {
  if (!TOKEN) {
    TOKEN = await login();
    if (!TOKEN) {
      console.log('Fornire TOKEN=xxx oppure EMAIL=xxx PASSWORD=xxx per login');
      process.exit(1);
    }
    console.log('Login OK, token ottenuto\n');
  }

  console.log('=== Test API Report Templates ===\n');

  // 1. GET report-templates
  const list = await request('GET', '/api/v1/report-templates?scope=audit');
  console.log('1. GET /report-templates:', list.status);
  if (list.data.success && list.data.data) {
    console.log('   Template trovati:', list.data.data.length);
    list.data.data.slice(0, 3).forEach((t) => console.log('   -', t.name, t.standard_key || '(org)'));
  } else {
    console.log('   Errore:', list.data);
  }

  // 2. GET resolve
  const resolve = await request('GET', '/api/v1/report-templates/resolve?standardId=1');
  console.log('\n2. GET /report-templates/resolve?standardId=1:', resolve.status);
  if (resolve.data.success && resolve.data.data) {
    console.log('   Template:', resolve.data.data.name, '->', resolve.data.data.file_path);
  } else {
    console.log('   Errore:', resolve.data);
  }

  // 3. PUT assign (usa primo template id dalla lista)
  const templateId = list.data?.data?.[0]?.id;
  if (templateId) {
    const assign = await request('PUT', '/api/v1/report-template-assignments/standard/1', {
      report_template_id: templateId,
    });
    console.log('\n3. PUT assign standard 1 -> template', templateId, ':', assign.status);
    if (assign.data.success) {
      console.log('   OK');
    } else {
      console.log('   Errore:', assign.data);
    }
  }

  console.log('\n=== Fine test ===');
}

main().catch((e) => {
  console.error('Errore:', e.message);
  process.exit(1);
});
