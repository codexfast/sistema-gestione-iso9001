/**
 * Test API custom checklists (Phase 5)
 * Richiede server avviato e TOKEN JWT valido.
 *
 * Uso:
 *   TOKEN=<jwt> node backend/scripts/test-custom-checklists-api.js
 *   Oppure con login: EMAIL=admin@sgq.local PASSWORD=xxx node backend/scripts/test-custom-checklists-api.js
 */

const BASE = process.env.API_BASE || 'http://localhost:10443/api/v1';

async function request(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function main() {
  let token = process.env.TOKEN;
  if (!token && process.env.EMAIL && process.env.PASSWORD) {
    const login = await request('POST', '/auth/login', {
      email: process.env.EMAIL,
      password: process.env.PASSWORD,
    });
    if (login.status !== 200) {
      console.error('Login fallito:', login.data);
      process.exit(1);
    }
    token = login.data?.token;
    if (!token) {
      console.error('Token non ricevuto:', login.data);
      process.exit(1);
    }
    console.log('Login OK');
  }
  if (!token) {
    console.error('Imposta TOKEN=... oppure EMAIL= e PASSWORD=');
    process.exit(1);
  }

  let checklistId, sectionId, itemId;

  try {
    // 1. GET custom-checklists
    const list = await request('GET', '/custom-checklists', null, token);
    console.log('\n1. GET /custom-checklists:', list.status, list.data?.data?.length ?? 0, 'checklist');

    // 2. POST custom-checklists
    const create = await request('POST', '/custom-checklists', {
      name: 'Test Checklist Phase 5',
      description: 'Checklist di prova',
    }, token);
    console.log('\n2. POST /custom-checklists:', create.status, create.data?.data?.id ? 'OK' : create.data);

    if (create.data?.data?.id) {
      checklistId = create.data.data.id;

      // 3. GET custom-checklists/:id
      const get = await request('GET', `/custom-checklists/${checklistId}`, null, token);
      console.log('\n3. GET /custom-checklists/:id:', get.status, get.data?.data?.sections?.length ?? 0, 'sezioni');

      // 4. POST section
      const sec = await request('POST', `/custom-checklists/${checklistId}/sections`, {
        code: '1.0',
        title: 'Sezione 1',
        display_order: 0,
      }, token);
      console.log('\n4. POST section:', sec.status, sec.data?.data?.id ? 'OK' : sec.data);

      if (sec.data?.data?.id) {
        sectionId = sec.data.data.id;

        // 5. POST item
        const item = await request('POST', `/custom-checklists/${checklistId}/items`, {
          section_id: sectionId,
          code: '1.1',
          title: 'Voce 1.1',
          response_type: 'verbale',
        }, token);
        console.log('\n5. POST item:', item.status, item.data?.data?.id ? 'OK' : item.data);

        if (item.data?.data?.id) {
          itemId = item.data.data.id;
        }
      }

      // 6. DELETE checklist (cleanup)
      const del = await request('DELETE', `/custom-checklists/${checklistId}`, null, token);
      console.log('\n6. DELETE /custom-checklists/:id:', del.status, del.data?.success ? 'OK' : del.data);
    }

    console.log('\n=== Test completato ===');
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  }
}

main();
