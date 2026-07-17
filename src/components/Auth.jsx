import React, { useState } from 'react';
import { Loader2, Mail, Lock, User, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

const COLORS = {
  paper: '#F3F2ED',
  ink: '#1D1B18',
  muted: '#736F65',
  deep: '#16302E',
  deepSoft: '#20423F',
  border: '#E2DFD3',
  white: '#FFFFFF',
};

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');";

function fontDisplay(weight = 600) {
  return { fontFamily: "'Fraunces', serif", fontWeight: weight };
}
function fontBody(weight = 400) {
  return { fontFamily: "'Inter', sans-serif", fontWeight: weight };
}

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград',
];

const inputStyle = {
  ...fontBody(500), fontSize: 14, background: COLORS.white,
  border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px',
  color: COLORS.ink, outline: 'none', width: '100%',
};
const labelStyle = { ...fontBody(600), fontSize: 12.5, color: COLORS.muted, marginBottom: 5, display: 'block' };

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) return;
    if (mode === 'register' && !name.trim()) return;

    setBusy(true);

    if (mode === 'register') {
      const { error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim(), city: city.trim() } },
      });
      if (authError) {
        setError(authError.message === 'User already registered'
          ? 'Этот email уже зарегистрирован'
          : authError.message);
        setBusy(false);
        return;
      }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Неверный email или пароль'
          : authError.message);
        setBusy(false);
        return;
      }
    }
    setBusy(false);
  }

  return (
    <div style={{ background: COLORS.deep, minHeight: 560 }} className="w-full flex items-center justify-center p-6">
      <style>{FONT_IMPORT}</style>
      <div style={{ background: COLORS.paper, borderRadius: 16, maxWidth: 400, width: '100%', padding: '32px 28px' }}>
        <div style={{ ...fontDisplay(700), fontSize: 30, color: COLORS.ink, letterSpacing: '-0.01em' }}>
          напрямую
        </div>
        <p style={{ ...fontBody(400), fontSize: 14, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>
          {mode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте аккаунт, чтобы начать'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3" style={{ marginTop: 20 }}>
          {mode === 'register' && (
            <>
              <div>
                <label style={labelStyle}>Как вас зовут?</label>
                <div className="flex items-center gap-2" style={{ ...inputStyle, padding: '0 12px' }}>
                  <User size={15} color={COLORS.muted} />
                  <input
                    style={{ ...inputStyle, border: 'none', padding: '9px 0', background: 'transparent' }}
                    value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Имя" required
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Город (необязательно)</label>
                <div className="flex items-center gap-2" style={{ ...inputStyle, padding: '0 12px' }}>
                  <MapPin size={15} color={COLORS.muted} />
                  <input
                    style={{ ...inputStyle, border: 'none', padding: '9px 0', background: 'transparent' }}
                    value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder="Москва" list="auth-cities"
                  />
                </div>
                <datalist id="auth-cities">
                  {CITIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Email</label>
            <div className="flex items-center gap-2" style={{ ...inputStyle, padding: '0 12px' }}>
              <Mail size={15} color={COLORS.muted} />
              <input
                style={{ ...inputStyle, border: 'none', padding: '9px 0', background: 'transparent' }}
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com" required
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Пароль</label>
            <div className="flex items-center gap-2" style={{ ...inputStyle, padding: '0 12px' }}>
              <Lock size={15} color={COLORS.muted} />
              <input
                style={{ ...inputStyle, border: 'none', padding: '9px 0', background: 'transparent' }}
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов" required minLength={6}
              />
            </div>
          </div>

          {error && (
            <p style={{ ...fontBody(500), fontSize: 13, color: '#A84B3A', marginTop: 4 }}>{error}</p>
          )}

          <button
            type="submit" disabled={busy}
            style={{
              ...fontBody(600), fontSize: 14, marginTop: 6, width: '100%', padding: '11px 0',
              borderRadius: 8, background: COLORS.deep, color: COLORS.white,
            }}
            className="flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={15} /> : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        <p
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={{ ...fontBody(500), fontSize: 13, color: COLORS.deep, marginTop: 14, textAlign: 'center', cursor: 'pointer' }}
        >
          {mode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
        </p>
      </div>
    </div>
  );
}
