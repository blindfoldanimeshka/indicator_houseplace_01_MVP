import { describe, it, expect, vi, beforeEach } from 'vitest';

const mock = vi.hoisted(() => {
  const tableReturns = {};
  const sequentialReturns = {};
  function createChain(table) {
    return {
      _table: table, _op: null, _insertData: null, _updateData: null,
      _filters: {}, _orderBy: null, _single: false,
      select(v) { this._op = 'select'; return this; },
      insert(v) { this._op = 'insert'; this._insertData = v; return this; },
      update(v) { this._op = 'update'; this._updateData = v; return this; },
      eq(c, v) { this._filters[c] = { op: 'eq', val: v }; return this; },
      ilike(c, v) { this._filters[c] = { op: 'ilike', val: v }; return this; },
      lte(c, v) { this._filters[c] = { op: 'lte', val: v }; return this; },
      is(c, v) { this._filters[c] = { op: 'is', val: v }; return this; },
      in(c, v) { this._filters[c] = { op: 'in', val: v }; return this; },
      order(c, o) { this._orderBy = { col: c, ...o }; return this; },
      single() { this._single = true; return this; },
      then(resolve) {
        let ret = (sequentialReturns[table] && sequentialReturns[table].length > 0)
          ? sequentialReturns[table].shift()
          : (tableReturns[table] || { data: null, error: null });
        let data = ret.data;
        if (this._single && Array.isArray(data)) data = data[0] || null;
        resolve({ data, error: ret.error });
      },
    };
  }
  const fromSpy = vi.fn((t) => createChain(t));
  const supabase = {
    from: fromSpy,
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
    removeChannel: vi.fn(),
    auth: { signUp: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  };
  return {
    supabase, fromSpy,
    mockTableData(t, d, e) { tableReturns[t] = { data: d, error: e || null }; },
    mockSequential(t, arr) { sequentialReturns[t] = arr.map(d => d instanceof Error ? { data: null, error: d } : { data: d, error: null }); },
    reset() {
      Object.keys(tableReturns).forEach(k => delete tableReturns[k]);
      Object.keys(sequentialReturns).forEach(k => delete sequentialReturns[k]);
      fromSpy.mockClear();
      supabase.auth.signUp.mockReset();
      supabase.auth.signInWithPassword.mockReset();
    },
  };
});

vi.mock('../../src/lib/supabase', () => ({ supabase: mock.supabase }));

import { fetchChats, openOrCreateChat, fetchThread, sendMessage, subscribeToChat } from '../../src/api/chats';

beforeEach(() => mock.reset());

describe('fetchChats', () => {
  it('returns empty array when user has no participations', async () => {
    mock.mockTableData('chat_participants', []);
    expect(await fetchChats('user-1')).toEqual([]);
  });

  it('assembles chat with participants, messages, and listing summary', async () => {
    mock.mockSequential('chat_participants', [
      [{ chat_id: 'c1', user_id: 'user-1' }],
      [{ chat_id: 'c1', user_id: 'user-1', users: { name: 'Алиса' } }, { chat_id: 'c1', user_id: 'user-2', users: { name: 'Борис' } }],
    ]);
    mock.mockTableData('chats', [{ id: 'c1', listing_id: 'l1', created_at: '2026-07-18T10:00:00Z' }]);
    mock.mockTableData('messages', [{ chat_id: 'c1', sender_id: 'user-1', sender: { name: 'Алиса' }, text: 'Привет', created_at: '2026-07-18T10:01:00Z' }]);
    mock.mockTableData('listings', [{ id: 'l1', type: 'offer', rooms: '1 комната', city: 'Москва', price: 45000 }]);

    const result = await fetchChats('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].chatId).toBe('c1');
    expect(result[0].listingSummary).toContain('Сдаётся');
    expect(result[0].messages[0].senderName).toBe('Алиса');
  });

  it('excludes chats with no messages', async () => {
    mock.mockSequential('chat_participants', [
      [{ chat_id: 'c-empty', user_id: 'user-1' }],
      [{ chat_id: 'c-empty', user_id: 'user-1', users: { name: 'User' } }],
    ]);
    mock.mockTableData('chats', [{ id: 'c-empty', listing_id: 'l1', created_at: '2026-07-18T10:00:00Z' }]);
    mock.mockTableData('messages', []);
    mock.mockTableData('listings', [{ id: 'l1', type: 'offer', rooms: 'Студия', city: 'Питер', price: 30000 }]);
    expect(await fetchChats('user-1')).toEqual([]);
  });
});

describe('openOrCreateChat', () => {
  it('returns existing chat if both users are participants', async () => {
    mock.mockSequential('chats', [[{ id: 'existing-chat' }]]);
    mock.mockTableData('chat_participants', [{ user_id: 'user-1' }, { user_id: 'user-2' }]);
    const result = await openOrCreateChat({ listingId: 'l1', listingSummary: '', userId: 'user-1', otherUserId: 'user-2' });
    expect(result).toBe('existing-chat');
  });

  it('creates new chat when none exist', async () => {
    mock.mockSequential('chats', [[], { id: 'new-chat', listing_id: 'l1', created_at: '2026-07-18T12:00:00Z' }]);
    mock.mockTableData('chat_participants', null);
    const result = await openOrCreateChat({ listingId: 'l1', listingSummary: '', userId: 'user-1', otherUserId: 'user-2' });
    expect(result).toBe('new-chat');
  });
});

describe('fetchThread', () => {
  it('assembles thread with messages, participants, and listing summary', async () => {
    mock.mockSequential('chat_participants', [[
      { user_id: 'user-1', users: { name: 'Алиса' } },
      { user_id: 'user-2', users: { name: 'Борис' } },
    ]]);
    mock.mockSequential('messages', [[
      { id: 'm1', sender_id: 'user-1', sender: { name: 'Алиса' }, text: 'Привет', created_at: '2026-07-18T10:00:00Z' },
    ]]);
    mock.mockSequential('chats', [{ listing_id: 'l1' }]);
    mock.mockSequential('listings', [{ type: 'offer', rooms: '1 комната', city: 'Москва', price: 45000 }]);

    const result = await fetchThread('c1');
    expect(result.chatId).toBe('c1');
    expect(result.messages[0].senderName).toBe('Алиса');
    expect(result.listingSummary).toContain('Сдаётся');
  });
});

describe('sendMessage', () => {
  it('inserts message with trimmed text', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null });
    const origFrom = mock.supabase.from;
    mock.supabase.from = vi.fn((t) => t === 'messages' ? { insert: insertSpy } : origFrom(t));
    await sendMessage({ chatId: 'c1', senderId: 'user-1', text: '  Привет  ' });
    expect(insertSpy).toHaveBeenCalledWith({ chat_id: 'c1', sender_id: 'user-1', text: 'Привет' });
    mock.supabase.from = origFrom;
  });

  it('throws on error', async () => {
    const origFrom = mock.supabase.from;
    mock.supabase.from = vi.fn((t) => t === 'messages' ? { insert: vi.fn().mockResolvedValue({ error: { message: 'fail' } }) } : origFrom(t));
    await expect(sendMessage({ chatId: 'c1', senderId: 'user-1', text: 'hi' })).rejects.toThrow();
    mock.supabase.from = origFrom;
  });
});

describe('subscribeToChat', () => {
  it('returns unsubscribe function', () => {
    expect(typeof subscribeToChat('c1', () => {})).toBe('function');
  });
  it('creates channel with correct name', () => {
    subscribeToChat('chat-abc', () => {});
    expect(mock.supabase.channel).toHaveBeenCalledWith('chat:chat-abc');
  });
});
