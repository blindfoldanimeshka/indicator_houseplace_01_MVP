import { http, HttpResponse } from 'msw';

const DB = {
  users: [],
  listings: [],
  chats: [],
  chat_participants: [],
  messages: [],
};

function resetDB() {
  DB.users.length = 0;
  DB.listings.length = 0;
  DB.chats.length = 0;
  DB.chat_participants.length = 0;
  DB.messages.length = 0;
}

function seedUser(id, name, city = '') {
  DB.users.push({ id, name, city, created_at: new Date().toISOString() });
}

function seedListing(id, authorId, type, city, rooms, price, area = null, description = '') {
  DB.listings.push({
    id, author_id: authorId, type, city, rooms, price, area, description,
    created_at: new Date().toISOString(), deleted_at: null,
  });
}

function applyPostgrestFilters(rows, searchParams) {
  let result = [...rows];
  for (const [key, rawVal] of searchParams.entries()) {
    if (key === 'select' || key === 'order') continue;

    // PostgREST format: column=op.value  e.g. "type=eq.offer", "deleted_at=is.null"
    const dotIdx = rawVal.indexOf('.');
    if (dotIdx === -1) continue;
    const op = rawVal.substring(0, dotIdx);
    const val = rawVal.substring(dotIdx + 1);

    if (op === 'eq') result = result.filter(r => r[key] === val);
    else if (op === 'neq') result = result.filter(r => r[key] !== val);
    else if (op === 'is' && val === 'null') result = result.filter(r => r[key] === null);
    else if (op === 'is' && val === 'not.null') result = result.filter(r => r[key] !== null);
    else if (op === 'ilike') {
      const pattern = val.replace(/%/g, '.*');
      const regex = new RegExp(`^${pattern}$`, 'i');
      result = result.filter(r => regex.test(r[key]));
    }
    else if (op === 'lte') result = result.filter(r => Number(r[key]) <= Number(val));
    else if (op === 'gte') result = result.filter(r => Number(r[key]) >= Number(val));
    else if (op === 'in') {
      const vals = val.replace(/^\(/, '').replace(/\)$/, '').split(',');
      result = result.filter(r => vals.includes(r[key]));
    }
  }
  return result;
}

function applySelect(rows, selectParam) {
  if (!selectParam || selectParam === '*') return rows;

  return rows.map(row => {
    const result = { ...row };
    // Handle foreign key joins like "users!listings_author_id_fkey(name)"
    const joinMatch = selectParam.match(/(\w+)!\w+\((\w+)\)/g);
    if (joinMatch) {
      for (const join of joinMatch) {
        const m = join.match(/(\w+)!\w+\((\w+)\)/);
        if (m) {
          const [, foreignTable, cols] = m;
          const colList = cols.split(',').map(c => c.trim());
          const lookup = DB[foreignTable]?.find(u => u.id === row[`${foreignTable === 'users' ? 'author' : foreignTable}_id`]);
          if (lookup) {
            result[foreignTable] = {};
            colList.forEach(c => { result[foreignTable][c] = lookup[c]; });
          } else {
            result[foreignTable] = null;
          }
        }
      }
    }
    return result;
  });
}

function applyOrder(rows, orderParam) {
  if (!orderParam) return rows;
  const [col, dir] = orderParam.split('.');
  return [...rows].sort((a, b) => {
    const aVal = a[col], bVal = b[col];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return dir === 'desc' ? -cmp : cmp;
  });
}

function isSingle(request) {
  return request.headers.get('accept')?.includes('application/vnd.pgrst.object');
}

function respond(request, data) {
  if (isSingle(request)) {
    return HttpResponse.json(Array.isArray(data) ? (data[0] || null) : data);
  }
  return HttpResponse.json(Array.isArray(data) ? data : data ? [data] : []);
}

const REST_URL = 'https://test.supabase.co';

export const handlers = [
  http.get(`${REST_URL}/rest/v1/listings`, ({ request }) => {
    const url = new URL(request.url);
    const select = url.searchParams.get('select');
    const order = url.searchParams.get('order');
    let rows = applyPostgrestFilters(DB.listings, url.searchParams);
    rows = applySelect(rows, select);
    rows = applyOrder(rows, order);
    return respond(request, rows);
  }),

  http.post(`${REST_URL}/rest/v1/listings`, async ({ request }) => {
    const body = await request.json();
    const listing = {
      id: crypto.randomUUID(),
      author_id: body.author_id, type: body.type, city: body.city,
      rooms: body.rooms, price: body.price, area: body.area || null,
      description: body.description || '',
      created_at: new Date().toISOString(), deleted_at: null,
    };
    DB.listings.push(listing);
    return respond(request, [listing]);
  }),

  http.patch(`${REST_URL}/rest/v1/listings`, async ({ request }) => {
    const url = new URL(request.url);
    const body = await request.json();
    const rows = applyPostgrestFilters(DB.listings, url.searchParams);
    for (const row of rows) Object.assign(row, body);
    return respond(request, rows);
  }),

  http.get(`${REST_URL}/rest/v1/users`, ({ request }) => {
    const url = new URL(request.url);
    let rows = applyPostgrestFilters(DB.users, url.searchParams);
    rows = applyOrder(rows, url.searchParams.get('order'));
    return respond(request, rows);
  }),

  http.patch(`${REST_URL}/rest/v1/users`, async ({ request }) => {
    const url = new URL(request.url);
    const body = await request.json();
    const rows = applyPostgrestFilters(DB.users, url.searchParams);
    for (const row of rows) Object.assign(row, body);
    return respond(request, rows);
  }),

  http.get(`${REST_URL}/rest/v1/chats`, ({ request }) => {
    const url = new URL(request.url);
    let rows = applyPostgrestFilters(DB.chats, url.searchParams);
    return respond(request, rows);
  }),

  http.post(`${REST_URL}/rest/v1/chats`, async ({ request }) => {
    const body = await request.json();
    const chat = { id: crypto.randomUUID(), listing_id: body.listing_id, created_at: new Date().toISOString() };
    DB.chats.push(chat);
    return respond(request, [chat]);
  }),

  http.get(`${REST_URL}/rest/v1/chat_participants`, ({ request }) => {
    const url = new URL(request.url);
    const select = url.searchParams.get('select');
    let rows = applyPostgrestFilters(DB.chat_participants, url.searchParams);
    if (select?.includes('users(')) {
      rows = rows.map(r => {
        const user = DB.users.find(u => u.id === r.user_id);
        return { ...r, users: user ? { name: user.name } : null };
      });
    }
    return respond(request, rows);
  }),

  http.post(`${REST_URL}/rest/v1/chat_participants`, async ({ request }) => {
    const body = await request.json();
    const items = Array.isArray(body) ? body : [body];
    for (const item of items) {
      DB.chat_participants.push({ chat_id: item.chat_id, user_id: item.user_id });
    }
    return respond(request, items);
  }),

  http.get(`${REST_URL}/rest/v1/messages`, ({ request }) => {
    const url = new URL(request.url);
    const select = url.searchParams.get('select');
    const order = url.searchParams.get('order');
    let rows = applyPostgrestFilters(DB.messages, url.searchParams);
    if (select?.includes('sender:') || select?.includes('sender:users')) {
      rows = rows.map(m => {
        const sender = DB.users.find(u => u.id === m.sender_id);
        return { ...m, sender: sender ? { name: sender.name } : null };
      });
    }
    rows = applyOrder(rows, order);
    return respond(request, rows);
  }),

  http.post(`${REST_URL}/rest/v1/messages`, async ({ request }) => {
    const body = await request.json();
    const msg = {
      id: crypto.randomUUID(),
      chat_id: body.chat_id, sender_id: body.sender_id,
      text: body.text, created_at: new Date().toISOString(),
    };
    DB.messages.push(msg);
    return respond(request, [msg]);
  }),
];

export { DB, resetDB, seedUser, seedListing };
