import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mock = vi.hoisted(() => {
  const tableReturns = {};
  const sequentialReturns = {};
  function createChain(table) {
    return {
      _table: table, _op: null, _insertData: null, _updateData: null,
      _filters: {}, _orderBy: null, _single: false,
      select(v) { this._op = 'select'; return this; },
      insert(v) { this._op = 'insert'; this._insertData = v; return this; },
      eq(c, v) { this._filters[c] = { op: 'eq', val: v }; return this; },
      is(c, v) { this._filters[c] = { op: 'is', val: v }; return this; },
      in(c, v) { this._filters[c] = { op: 'in', val: v }; return this; },
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

import Auth from '../../src/components/Auth';

beforeEach(() => mock.reset());

describe('Auth', () => {
  it('shows login form by default', () => {
    render(<Auth />);
    expect(screen.getByText('Войти')).toBeInTheDocument();
    expect(screen.getByText('Нет аккаунта? Зарегистрируйтесь')).toBeInTheDocument();
  });

  it('switches to register mode', () => {
    render(<Auth />);
    fireEvent.click(screen.getByText('Нет аккаунта? Зарегистрируйтесь'));
    expect(screen.getByText('Зарегистрироваться')).toBeInTheDocument();
    expect(screen.getByText('Как вас зовут?')).toBeInTheDocument();
  });

  it('switches back to login mode', () => {
    render(<Auth />);
    fireEvent.click(screen.getByText('Нет аккаунта? Зарегистрируйтесь'));
    fireEvent.click(screen.getByText('Уже есть аккаунт? Войдите'));
    expect(screen.getByText('Войти')).toBeInTheDocument();
  });

  it('calls signInWithPassword on login', async () => {
    mock.supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    render(<Auth />);
    fireEvent.change(screen.getByPlaceholderText('you@email.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Войти'));
    await waitFor(() => {
      expect(mock.supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' });
    });
  });

  it('shows Russian error for "Invalid login credentials"', async () => {
    mock.supabase.auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<Auth />);
    fireEvent.change(screen.getByPlaceholderText('you@email.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Войти'));
    await waitFor(() => expect(screen.getByText('Неверный email или пароль')).toBeInTheDocument());
  });

  it('shows Russian error for "User already registered"', async () => {
    mock.supabase.auth.signUp.mockResolvedValue({ error: { message: 'User already registered' } });
    render(<Auth />);
    fireEvent.click(screen.getByText('Нет аккаунта? Зарегистрируйтесь'));
    fireEvent.change(screen.getByPlaceholderText('Имя'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('you@email.com'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByPlaceholderText('Минимум 6 символов'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByText('Зарегистрироваться'));
    await waitFor(() => expect(screen.getByText('Этот email уже зарегистрирован')).toBeInTheDocument());
  });
});
