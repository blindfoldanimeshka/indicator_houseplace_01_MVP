import { describe, it, expect, vi, beforeEach } from 'vitest';

// Inline mock factory (can't use imports in vi.hoisted)
const mock = vi.hoisted(() => {
  const tableReturns = {};
  const sequentialReturns = {};

  function createChain(table) {
    return {
      _table: table, _op: null, _insertData: null, _updateData: null,
      _filters: {}, _orderBy: null, _selectVal: null, _single: false,
      select(v) { this._op = 'select'; this._selectVal = v; return this; },
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
    mockInsertReturn(t, d, e) { tableReturns[t] = { data: d, error: e || null }; },
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

import { fetchListings, createListing, deleteListing, fetchMyListings } from '../../src/api/listings';

beforeEach(() => mock.reset());

describe('fetchListings', () => {
  it('returns mapped listings from all non-deleted rows', async () => {
    mock.mockTableData('listings', [{
      id: '1', author_id: 'u1', type: 'offer', city: 'Москва',
      rooms: '1 комната', price: 45000, area: 40, description: 'Квартира',
      created_at: '2026-07-18T10:00:00Z', deleted_at: null, users: { name: 'Иван' },
    }]);
    const result = await fetchListings();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: '1', authorId: 'u1', authorName: 'Иван', type: 'offer', city: 'Москва',
      rooms: '1 комната', price: 45000, area: 40, description: 'Квартира',
      createdAt: new Date('2026-07-18T10:00:00Z').getTime(),
    });
  });

  it('applies type filter', async () => {
    mock.mockTableData('listings', []);
    await fetchListings({ type: 'offer' });
    const chain = mock.fromSpy.mock.results[0].value;
    expect(chain._filters.type).toEqual({ op: 'eq', val: 'offer' });
  });

  it('escapes ILIKE wildcards in city filter', async () => {
    mock.mockTableData('listings', []);
    await fetchListings({ city: '100%' });
    const chain = mock.fromSpy.mock.results[0].value;
    expect(chain._filters.city).toEqual({ op: 'ilike', val: '%100\\%%' });
  });

  it('returns empty array when no listings exist', async () => {
    mock.mockTableData('listings', []);
    expect(await fetchListings()).toEqual([]);
  });
});

describe('createListing', () => {
  it('inserts listing with trimmed values', async () => {
    mock.mockInsertReturn('listings', { id: '2', city: 'Питер', description: 'Ищу', price: 50000, area: 60 });
    const result = await createListing({ userId: 'u1', type: 'request', city: '  Питер  ', rooms: '2 комнаты', price: '50000', area: '60', description: '  Ищу  ' });
    expect(result.city).toBe('Питер');
    expect(result.description).toBe('Ищу');
    expect(result.price).toBe(50000);
  });

  it('sets area to null when empty', async () => {
    mock.mockInsertReturn('listings', { id: '3', area: null });
    const result = await createListing({ userId: 'u1', type: 'offer', city: 'Москва', rooms: 'Студия', price: '30000', area: '', description: '' });
    expect(result.area).toBeNull();
  });

  it('throws on error', async () => {
    mock.mockInsertReturn('listings', null, { message: 'DB error' });
    await expect(createListing({ userId: 'u1', type: 'offer', city: 'Москва', rooms: 'Студия', price: '30000', area: '', description: '' })).rejects.toThrow();
  });
});

describe('deleteListing', () => {
  it('sets deleted_at timestamp (soft delete)', async () => {
    mock.mockTableData('listings', null);
    await deleteListing('listing-1');
    const chain = mock.fromSpy.mock.results[0].value;
    expect(chain._op).toBe('update');
    expect(chain._updateData.deleted_at).toBeDefined();
    expect(chain._filters.id).toEqual({ op: 'eq', val: 'listing-1' });
  });
});

describe('fetchMyListings', () => {
  it('filters by author_id and deleted_at IS NULL', async () => {
    mock.mockTableData('listings', [{ id: '10', author_id: 'u1', type: 'offer', city: 'Казань', rooms: '3 комнаты', price: 35000, area: 70, description: '', created_at: '2026-07-18T09:00:00Z', deleted_at: null }]);
    const result = await fetchMyListings('u1');
    expect(result).toHaveLength(1);
    expect(result[0].authorId).toBe('u1');
    const chain = mock.fromSpy.mock.results[0].value;
    expect(chain._filters.author_id).toEqual({ op: 'eq', val: 'u1' });
    expect(chain._filters.deleted_at).toEqual({ op: 'is', val: null });
  });

  it('returns empty for user with no listings', async () => {
    mock.mockTableData('listings', []);
    expect(await fetchMyListings('u-nobody')).toEqual([]);
  });
});
