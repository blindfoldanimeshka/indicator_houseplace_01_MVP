export function createMockSupabase() {
  const tableReturns = {};
  const sequentialReturns = {};

  function createChain(table) {
    const chain = {
      _table: table,
      _op: null,
      _insertData: null,
      _updateData: null,
      _filters: {},
      _orderBy: null,
      _selectVal: null,
      _single: false,

      select(val) { this._op = 'select'; this._selectVal = val; return this; },
      insert(val) { this._op = 'insert'; this._insertData = val; return this; },
      update(val) { this._op = 'update'; this._updateData = val; return this; },
      eq(col, val) { this._filters[col] = { op: 'eq', val }; return this; },
      neq(col, val) { this._filters[col] = { op: 'neq', val }; return this; },
      ilike(col, val) { this._filters[col] = { op: 'ilike', val }; return this; },
      lte(col, val) { this._filters[col] = { op: 'lte', val }; return this; },
      is(col, val) { this._filters[col] = { op: 'is', val }; return this; },
      in(col, val) { this._filters[col] = { op: 'in', val }; return this; },
      order(col, opts) { this._orderBy = { col, ...opts }; return this; },
      single() { this._single = true; return this; },

      then(resolve, reject) {
        let ret;
        if (sequentialReturns[table] && sequentialReturns[table].length > 0) {
          ret = sequentialReturns[table].shift();
        } else {
          ret = tableReturns[table] || { data: null, error: null };
        }
        let data = ret.data;
        if (this._single && Array.isArray(data)) {
          data = data[0] || null;
        }
        resolve({ data, error: ret.error });
      },
    };
    return chain;
  }

  const fromSpy = vi.fn((table) => createChain(table));

  const channelSpy = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }));

  const removeChannelSpy = vi.fn();

  const supabase = {
    from: fromSpy,
    channel: channelSpy,
    removeChannel: removeChannelSpy,
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  };

  function mockTableData(table, data, error = null) {
    tableReturns[table] = { data, error };
  }

  function mockSequential(table, dataArray) {
    sequentialReturns[table] = dataArray.map((d) =>
      d instanceof Error ? { data: null, error: d } : { data: d, error: null }
    );
  }

  function mockInsertReturn(table, data, error = null) {
    tableReturns[table] = { data, error };
  }

  function reset() {
    Object.keys(tableReturns).forEach((k) => delete tableReturns[k]);
    Object.keys(sequentialReturns).forEach((k) => delete sequentialReturns[k]);
    fromSpy.mockClear();
    channelSpy.mockClear();
    removeChannelSpy.mockClear();
    supabase.auth.signUp.mockReset();
    supabase.auth.signInWithPassword.mockReset();
    supabase.auth.signOut.mockReset();
    supabase.auth.getSession.mockReset();
    supabase.auth.onAuthStateChange.mockReset();
    supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  }

  return { supabase, fromSpy, mockTableData, mockInsertReturn, mockSequential, reset, tableReturns };
}
