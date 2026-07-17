import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home, Search, MessageCircle, Plus, X, MapPin, Send, User,
  Trash2, ChevronLeft, SlidersHorizontal, Loader2, Pencil, Inbox
} from 'lucide-react';

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');";

const COLORS = {
  paper: '#F3F2ED',
  paperSoft: '#EAE8E0',
  ink: '#1D1B18',
  muted: '#736F65',
  deep: '#16302E',
  deepSoft: '#20423F',
  offer: '#B9713A',
  offerBg: '#FAF0E3',
  offerBorder: '#E8D2B4',
  request: '#3E7C74',
  requestBg: '#E9F2EF',
  requestBorder: '#C6DDD7',
  border: '#E2DFD3',
  white: '#FFFFFF',
};

const CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
  'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград',
];

const ROOM_OPTIONS = ['Студия', '1 комната', '2 комнаты', '3 комнаты', '4+ комнат'];

function fontDisplay(weight = 600) {
  return { fontFamily: "'Fraunces', serif", fontWeight: weight };
}
function fontBody(weight = 400) {
  return { fontFamily: "'Inter', sans-serif", fontWeight: weight };
}
function fontMono(weight = 600) {
  return { fontFamily: "'IBM Plex Mono', monospace", fontWeight: weight };
}

async function storageGet(key, shared = false) {
  try {
    const res = await window.storage.get(key, shared);
    return res ? res.value : null;
  } catch (e) {
    return null;
  }
}
async function storageSet(key, value, shared = false) {
  try {
    await window.storage.set(key, value, shared);
    return true;
  } catch (e) {
    console.error('storage set failed', e);
    return false;
  }
}
async function storageList(prefix, shared = false) {
  try {
    const res = await window.storage.list(prefix, shared);
    return (res && res.keys) || [];
  } catch (e) {
    return [];
  }
}
async function storageDelete(key, shared = false) {
  try {
    await window.storage.delete(key, shared);
    return true;
  } catch (e) {
    return false;
  }
}

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function formatPrice(n) {
  return `${Number(n).toLocaleString('ru-RU')} ₽/мес`;
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} дн назад`;
  return new Date(ts).toLocaleDateString('ru-RU');
}

function DirectionTag({ type, size = 'md' }) {
  const isOffer = type === 'offer';
  const color = isOffer ? COLORS.offer : COLORS.request;
  const bg = isOffer ? COLORS.offerBg : COLORS.requestBg;
  const Icon = isOffer ? Home : Search;
  const label = isOffer ? 'Сдаётся' : 'Ищут';
  const pad = size === 'sm' ? '3px 8px' : '4px 10px';
  const fs = size === 'sm' ? 11 : 12.5;
  return (
    <span
      style={{
        background: bg, color, padding: pad, borderRadius: 999,
        display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: fs,
        ...fontBody(600), letterSpacing: '0.01em', whiteSpace: 'nowrap',
      }}
    >
      <Icon size={size === 'sm' ? 11 : 13} strokeWidth={2.5} />
      {label}
    </span>
  );
}

function ListingCard({ listing, isMine, onContact, onDelete }) {
  const isOffer = listing.type === 'offer';
  const railColor = isOffer ? COLORS.offer : COLORS.request;
  return (
    <div
      style={{
        background: COLORS.white, border: `1px solid ${COLORS.border}`,
        borderLeft: `4px solid ${railColor}`, borderRadius: 10, padding: '16px 18px',
      }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <DirectionTag type={listing.type} />
        <span style={{ ...fontMono(600), color: COLORS.ink, fontSize: 16 }}>
          {formatPrice(listing.price)}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-wrap" style={{ ...fontBody(500), color: COLORS.ink, fontSize: 14.5 }}>
        <span className="flex items-center gap-1">
          <MapPin size={13} color={COLORS.muted} /> {listing.city}
        </span>
        <span style={{ color: COLORS.border }}>·</span>
        <span>{listing.rooms}</span>
        {listing.area ? (
          <>
            <span style={{ color: COLORS.border }}>·</span>
            <span>{listing.area} м²</span>
          </>
        ) : null}
      </div>
      {listing.description ? (
        <p style={{ ...fontBody(400), color: COLORS.muted, fontSize: 13.5, lineHeight: 1.5 }}>
          {listing.description}
        </p>
      ) : null}
      <div className="flex items-center justify-between mt-1 pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <span style={{ ...fontBody(500), color: COLORS.muted, fontSize: 12.5 }}>
          {listing.authorName} · {timeAgo(listing.createdAt)}
        </span>
        {isMine ? (
          <button
            onClick={() => onDelete(listing.id)}
            style={{ ...fontBody(600), color: '#A84B3A', fontSize: 13 }}
            className="flex items-center gap-1 hover:opacity-70"
          >
            <Trash2 size={14} /> Удалить
          </button>
        ) : (
          <button
            onClick={() => onContact(listing)}
            style={{ ...fontBody(600), color: COLORS.deep, fontSize: 13 }}
            className="flex items-center gap-1 hover:opacity-70"
          >
            <MessageCircle size={14} /> Написать
          </button>
        )}
      </div>
    </div>
  );
}

function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...fontBody(600), fontSize: 13.5,
        color: active ? COLORS.deep : COLORS.muted,
        background: active ? COLORS.white : 'transparent',
        borderRadius: 999, padding: '7px 14px',
      }}
      className="flex items-center gap-1.5 transition-colors"
    >
      <Icon size={15} strokeWidth={2.3} />
      {label}
    </button>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [onboardName, setOnboardName] = useState('');
  const [onboardCity, setOnboardCity] = useState('');
  const [onboardBusy, setOnboardBusy] = useState(false);

  const [view, setView] = useState('feed');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCity, setEditCity] = useState('');

  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterCity, setFilterCity] = useState('');
  const [filterRooms, setFilterRooms] = useState('any');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');

  const [form, setForm] = useState({
    type: 'offer', city: '', rooms: '1 комната', price: '', area: '', description: '',
  });
  const [posting, setPosting] = useState(false);

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const pollRef = useRef(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    (async () => {
      const raw = await storageGet('profile', false);
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch (e) {}
      }
      setLoading(false);
    })();
  }, []);

  async function completeOnboarding() {
    if (!onboardName.trim()) return;
    setOnboardBusy(true);
    const p = { userId: genId('user'), name: onboardName.trim(), city: onboardCity.trim() };
    await storageSet('profile', JSON.stringify(p), false);
    setProfile(p);
    setOnboardBusy(false);
  }

  async function saveProfileEdits() {
    const p = { ...profile, name: editName.trim() || profile.name, city: editCity.trim() };
    await storageSet('profile', JSON.stringify(p), false);
    setProfile(p);
    setEditingProfile(false);
  }

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    const keys = await storageList('listing:', true);
    const raws = await Promise.all(keys.map((k) => storageGet(k, true)));
    const items = raws
      .filter(Boolean)
      .map((r) => { try { return JSON.parse(r); } catch (e) { return null; } })
      .filter(Boolean);
    items.sort((a, b) => b.createdAt - a.createdAt);
    setListings(items);
    setListingsLoading(false);
  }, []);

  useEffect(() => {
    if (profile && (view === 'feed' || view === 'mine')) loadListings();
  }, [profile, view, loadListings]);

  async function submitListing(e) {
    e.preventDefault();
    if (!form.city.trim() || !form.price) return;
    setPosting(true);
    const id = genId('listing');
    const item = {
      id, authorId: profile.userId, authorName: profile.name,
      type: form.type, city: form.city.trim(), rooms: form.rooms,
      price: Number(form.price), area: form.area ? Number(form.area) : null,
      description: form.description.trim(), createdAt: Date.now(),
    };
    await storageSet(`listing:${id}`, JSON.stringify(item), true);
    setForm({ type: form.type, city: '', rooms: '1 комната', price: '', area: '', description: '' });
    setPosting(false);
    setView('mine');
  }

  async function removeListing(id) {
    await storageDelete(`listing:${id}`, true);
    setListings((prev) => prev.filter((l) => l.id !== id));
  }

  function convKeyFor(listing) {
    const ids = [profile.userId, listing.authorId].sort();
    return `chat:${listing.id}:${ids.join('_')}`;
  }

  async function openChatWithListing(listing) {
    const key = convKeyFor(listing);
    const raw = await storageGet(key, true);
    let thread;
    if (raw) {
      try { thread = JSON.parse(raw); } catch (e) { thread = null; }
    }
    if (!thread) {
      thread = {
        listingId: listing.id,
        listingSummary: `${listing.type === 'offer' ? 'Сдаётся' : 'Ищут'} · ${listing.rooms} · ${listing.city} · ${formatPrice(listing.price)}`,
        participants: { [profile.userId]: profile.name, [listing.authorId]: listing.authorName },
        messages: [],
      };
    }
    setActiveConv({ key, thread });
    setView('thread');
  }

  const loadChats = useCallback(async () => {
    if (!profile) return;
    setChatsLoading(true);
    const keys = await storageList('chat:', true);
    const mine = keys.filter((k) => k.includes(profile.userId));
    const raws = await Promise.all(mine.map((k) => storageGet(k, true)));
    const items = mine
      .map((k, i) => {
        try { return { key: k, thread: JSON.parse(raws[i]) }; } catch (e) { return null; }
      })
      .filter((x) => x && x.thread && x.thread.messages && x.thread.messages.length > 0);
    items.sort((a, b) => {
      const at = a.thread.messages[a.thread.messages.length - 1]?.ts || 0;
      const bt = b.thread.messages[b.thread.messages.length - 1]?.ts || 0;
      return bt - at;
    });
    setChats(items);
    setChatsLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profile && view === 'chats') loadChats();
  }, [profile, view, loadChats]);

  useEffect(() => {
    if (view === 'thread' && activeConv) {
      pollRef.current = setInterval(async () => {
        const raw = await storageGet(activeConv.key, true);
        if (raw) {
          try {
            const thread = JSON.parse(raw);
            setActiveConv((prev) => (prev && prev.key === activeConv.key ? { ...prev, thread } : prev));
          } catch (e) {}
        }
      }, 4000);
      return () => clearInterval(pollRef.current);
    }
  }, [view, activeConv?.key]);

  useEffect(() => {
    if (view === 'thread') threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.thread?.messages?.length, view]);

  async function sendMessage() {
    if (!msgInput.trim() || !activeConv) return;
    setSending(true);
    const raw = await storageGet(activeConv.key, true);
    let thread = raw ? JSON.parse(raw) : activeConv.thread;
    thread.messages = [
      ...thread.messages,
      { senderId: profile.userId, senderName: profile.name, text: msgInput.trim(), ts: Date.now() },
    ];
    await storageSet(activeConv.key, JSON.stringify(thread), true);
    setActiveConv({ ...activeConv, thread });
    setMsgInput('');
    setSending(false);
  }

  const filteredListings = listings.filter((l) => {
    if (filterType !== 'all' && l.type !== filterType) return false;
    if (filterCity && !l.city.toLowerCase().includes(filterCity.toLowerCase())) return false;
    if (filterRooms !== 'any' && l.rooms !== filterRooms) return false;
    if (filterMaxPrice && l.price > Number(filterMaxPrice)) return false;
    return true;
  });
  const myListings = listings.filter((l) => profile && l.authorId === profile.userId);

  const inputStyle = {
    ...fontBody(500), fontSize: 14, background: COLORS.white,
    border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '9px 12px', color: COLORS.ink,
    outline: 'none', width: '100%',
  };
  const labelStyle = { ...fontBody(600), fontSize: 12.5, color: COLORS.muted, marginBottom: 5, display: 'block' };

  if (loading) {
    return (
      <div style={{ background: COLORS.paper, minHeight: 480 }} className="w-full flex items-center justify-center">
        <style>{FONT_IMPORT}</style>
        <Loader2 className="animate-spin" size={26} color={COLORS.muted} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ background: COLORS.deep, minHeight: 560 }} className="w-full flex items-center justify-center p-6">
        <style>{FONT_IMPORT}</style>
        <div style={{ background: COLORS.paper, borderRadius: 16, maxWidth: 400, width: '100%', padding: '32px 28px' }}>
          <div style={{ ...fontDisplay(700), fontSize: 30, color: COLORS.ink, letterSpacing: '-0.01em' }}>
            напрямую
          </div>
          <p style={{ ...fontBody(400), fontSize: 14, color: COLORS.muted, marginTop: 6, lineHeight: 1.5 }}>
            Аренда жилья без агентств. Собственники и арендаторы находят друг друга напрямую — и публикуют объявления в обе стороны.
          </p>
          <div style={{ marginTop: 22 }}>
            <label style={labelStyle}>Как вас зовут?</label>
            <input
              style={inputStyle} value={onboardName} onChange={(e) => setOnboardName(e.target.value)}
              placeholder="Имя" onKeyDown={(e) => e.key === 'Enter' && completeOnboarding()}
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <label style={labelStyle}>Ваш город (необязательно)</label>
            <input
              style={inputStyle} value={onboardCity} onChange={(e) => setOnboardCity(e.target.value)}
              placeholder="Москва" list="cities-list" onKeyDown={(e) => e.key === 'Enter' && completeOnboarding()}
            />
            <datalist id="cities-list">
              {CITIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <button
            onClick={completeOnboarding} disabled={!onboardName.trim() || onboardBusy}
            style={{
              ...fontBody(600), fontSize: 14, marginTop: 20, width: '100%', padding: '11px 0',
              borderRadius: 8, background: onboardName.trim() ? COLORS.deep : COLORS.border,
              color: onboardName.trim() ? COLORS.white : COLORS.muted,
            }}
            className="flex items-center justify-center gap-2"
          >
            {onboardBusy ? <Loader2 className="animate-spin" size={15} /> : 'Начать'}
          </button>
          <p style={{ ...fontBody(400), fontSize: 11.5, color: COLORS.muted, marginTop: 14, lineHeight: 1.5 }}>
            Это демо-прототип: объявления и сообщения хранятся в общем хранилище и видны всем, кто открывает этот MVP.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: 640, ...fontBody(400) }} className="w-full flex flex-col">
      <style>{FONT_IMPORT}</style>

      <div style={{ background: COLORS.deep }} className="w-full">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div style={{ ...fontDisplay(700), fontSize: 20, color: COLORS.white, letterSpacing: '-0.01em' }}>
            напрямую
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <NavButton active={view === 'feed'} icon={Home} label="Лента" onClick={() => setView('feed')} />
            <NavButton active={view === 'new'} icon={Plus} label="Разместить" onClick={() => setView('new')} />
            <NavButton active={view === 'mine'} icon={User} label="Мои" onClick={() => setView('mine')} />
            <NavButton active={view === 'chats' || view === 'thread'} icon={MessageCircle} label="Сообщения" onClick={() => setView('chats')} />
          </div>
          {!editingProfile ? (
            <button
              onClick={() => { setEditingProfile(true); setEditName(profile.name); setEditCity(profile.city || ''); }}
              style={{ ...fontBody(500), fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}
              className="flex items-center gap-1.5"
            >
              <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 999, width: 22, height: 22 }} className="flex items-center justify-center">
                <User size={12} color={COLORS.white} />
              </span>
              {profile.name}{profile.city ? ` · ${profile.city}` : ''}
              <Pencil size={11} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input style={{ ...inputStyle, width: 100, padding: '5px 8px', fontSize: 12.5 }} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Имя" />
              <input style={{ ...inputStyle, width: 100, padding: '5px 8px', fontSize: 12.5 }} value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Город" list="cities-list" />
              <button onClick={saveProfileEdits} style={{ ...fontBody(600), fontSize: 12, color: COLORS.white, background: COLORS.deepSoft, borderRadius: 6, padding: '5px 10px' }}>Ок</button>
            </div>
          )}
        </div>
      </div>

      <datalist id="cities-list">
        {CITIES.map((c) => <option key={c} value={c} />)}
      </datalist>

      <div className="max-w-3xl mx-auto w-full px-4 py-6 flex-1">

        {view === 'feed' && (
          <div className="flex flex-col gap-4">
            <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <SlidersHorizontal size={14} color={COLORS.muted} />
                {['all', 'offer', 'request'].map((t) => (
                  <button
                    key={t} onClick={() => setFilterType(t)}
                    style={{
                      ...fontBody(600), fontSize: 12.5, padding: '5px 12px', borderRadius: 999,
                      background: filterType === t ? (t === 'offer' ? COLORS.offer : t === 'request' ? COLORS.request : COLORS.deep) : COLORS.paperSoft,
                      color: filterType === t ? COLORS.white : COLORS.muted,
                    }}
                  >
                    {t === 'all' ? 'Все' : t === 'offer' ? 'Сдаю' : 'Ищу'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input style={{ ...inputStyle, width: 150 }} placeholder="Город" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} list="cities-list" />
                <select style={{ ...inputStyle, width: 150 }} value={filterRooms} onChange={(e) => setFilterRooms(e.target.value)}>
                  <option value="any">Любое кол-во комнат</option>
                  {ROOM_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input style={{ ...inputStyle, width: 150 }} type="number" placeholder="Цена до, ₽" value={filterMaxPrice} onChange={(e) => setFilterMaxPrice(e.target.value)} />
              </div>
            </div>

            {listingsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" size={22} color={COLORS.muted} /></div>
            ) : filteredListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p style={{ ...fontBody(500), color: COLORS.muted, fontSize: 14 }}>
                  Пока нет объявлений с такими параметрами. Сбросьте фильтры или станьте первым — разместите своё.
                </p>
                <button onClick={() => setView('new')} style={{ ...fontBody(600), fontSize: 13.5, color: COLORS.white, background: COLORS.deep, borderRadius: 8, padding: '9px 18px', marginTop: 14 }}>
                  Разместить объявление
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredListings.map((l) => (
                  <ListingCard key={l.id} listing={l} isMine={l.authorId === profile.userId} onContact={openChatWithListing} onDelete={removeListing} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'new' && (
          <form onSubmit={submitListing} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 22 }} className="flex flex-col gap-4 max-w-lg">
            <div style={{ ...fontDisplay(600), fontSize: 19, color: COLORS.ink }}>Новое объявление</div>
            <div className="flex gap-2">
              {[{ v: 'offer', l: 'Сдаю', c: COLORS.offer }, { v: 'request', l: 'Ищу', c: COLORS.request }].map((opt) => (
                <button
                  key={opt.v} type="button" onClick={() => setForm({ ...form, type: opt.v })}
                  style={{
                    flex: 1, ...fontBody(600), fontSize: 14, padding: '10px 0', borderRadius: 8,
                    background: form.type === opt.v ? opt.c : COLORS.paperSoft,
                    color: form.type === opt.v ? COLORS.white : COLORS.muted,
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <div>
              <label style={labelStyle}>Город</label>
              <input style={inputStyle} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Москва" list="cities-list" required />
            </div>
            <div className="flex gap-3">
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>{form.type === 'offer' ? 'Комнат' : 'Нужно комнат'}</label>
                <select style={inputStyle} value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })}>
                  {ROOM_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Площадь, м² (необязательно)</label>
                <input style={inputStyle} type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="45" />
              </div>
            </div>
            <div>
              <label style={labelStyle}>{form.type === 'offer' ? 'Цена, ₽/мес' : 'Готовы платить до, ₽/мес'}</label>
              <input style={inputStyle} type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="45000" required />
            </div>
            <div>
              <label style={labelStyle}>Описание</label>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={form.type === 'offer' ? 'Ремонт, мебель, условия сдачи…' : 'Район, сроки, пожелания к квартире…'}
              />
            </div>
            <button
              type="submit" disabled={posting}
              style={{ ...fontBody(600), fontSize: 14, color: COLORS.white, background: COLORS.deep, borderRadius: 8, padding: '11px 0' }}
              className="flex items-center justify-center gap-2"
            >
              {posting ? <Loader2 className="animate-spin" size={15} /> : 'Опубликовать'}
            </button>
          </form>
        )}

        {view === 'mine' && (
          <div className="flex flex-col gap-3">
            <div style={{ ...fontDisplay(600), fontSize: 19, color: COLORS.ink }}>Мои объявления</div>
            {listingsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" size={22} color={COLORS.muted} /></div>
            ) : myListings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <p style={{ ...fontBody(500), color: COLORS.muted, fontSize: 14 }}>
                  Вы ещё ничего не разместили. Сдаёте квартиру или ищете — начните здесь.
                </p>
                <button onClick={() => setView('new')} style={{ ...fontBody(600), fontSize: 13.5, color: COLORS.white, background: COLORS.deep, borderRadius: 8, padding: '9px 18px', marginTop: 14 }}>
                  Разместить объявление
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {myListings.map((l) => (
                  <ListingCard key={l.id} listing={l} isMine onDelete={removeListing} onContact={() => {}} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'chats' && (
          <div className="flex flex-col gap-3">
            <div style={{ ...fontDisplay(600), fontSize: 19, color: COLORS.ink }}>Сообщения</div>
            {chatsLoading ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" size={22} color={COLORS.muted} /></div>
            ) : chats.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <Inbox size={26} color={COLORS.muted} style={{ margin: '0 auto 10px' }} />
                <p style={{ ...fontBody(500), color: COLORS.muted, fontSize: 14 }}>
                  Сообщений пока нет. Напишите владельцу или арендатору прямо из объявления в ленте.
                </p>
                <button onClick={() => setView('feed')} style={{ ...fontBody(600), fontSize: 13.5, color: COLORS.white, background: COLORS.deep, borderRadius: 8, padding: '9px 18px', marginTop: 14 }}>
                  Перейти в ленту
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {chats.map(({ key, thread }) => {
                  const otherId = Object.keys(thread.participants).find((id) => id !== profile.userId);
                  const otherName = thread.participants[otherId] || 'Собеседник';
                  const last = thread.messages[thread.messages.length - 1];
                  return (
                    <button
                      key={key} onClick={() => { setActiveConv({ key, thread }); setView('thread'); }}
                      style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '13px 16px', textAlign: 'left' }}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ ...fontBody(700), fontSize: 14, color: COLORS.ink }}>{otherName}</span>
                        <span style={{ ...fontBody(400), fontSize: 11.5, color: COLORS.muted }}>{timeAgo(last.ts)}</span>
                      </div>
                      <span style={{ ...fontBody(500), fontSize: 12, color: COLORS.muted }}>{thread.listingSummary}</span>
                      <span style={{ ...fontBody(400), fontSize: 13, color: COLORS.ink, opacity: 0.75 }}>
                        {last.senderId === profile.userId ? 'Вы: ' : ''}{last.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'thread' && activeConv && (
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 520 }}>
            <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '12px 16px' }} className="flex items-center gap-2">
              <button onClick={() => setView('chats')} className="flex items-center"><ChevronLeft size={18} color={COLORS.muted} /></button>
              <div className="flex flex-col">
                <span style={{ ...fontBody(700), fontSize: 14, color: COLORS.ink }}>
                  {Object.entries(activeConv.thread.participants).find(([id]) => id !== profile.userId)?.[1] || 'Собеседник'}
                </span>
                <span style={{ ...fontBody(500), fontSize: 11.5, color: COLORS.muted }}>{activeConv.thread.listingSummary}</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8, background: COLORS.paperSoft }}>
              {activeConv.thread.messages.length === 0 ? (
                <p style={{ ...fontBody(500), fontSize: 13, color: COLORS.muted, textAlign: 'center', margin: 'auto' }}>
                  Напишите первое сообщение — это начнёт переписку.
                </p>
              ) : activeConv.thread.messages.map((m, i) => {
                const mine = m.senderId === profile.userId;
                return (
                  <div key={i} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <div
                      style={{
                        background: mine ? COLORS.deep : COLORS.white, color: mine ? COLORS.white : COLORS.ink,
                        border: mine ? 'none' : `1px solid ${COLORS.border}`, borderRadius: 12,
                        padding: '8px 12px', ...fontBody(450), fontSize: 13.5, lineHeight: 1.45,
                      }}
                    >
                      {m.text}
                    </div>
                    <div style={{ ...fontBody(400), fontSize: 10.5, color: COLORS.muted, marginTop: 3, textAlign: mine ? 'right' : 'left' }}>
                      {timeAgo(m.ts)}
                    </div>
                  </div>
                );
              })}
              <div ref={threadEndRef} />
            </div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: 12 }} className="flex items-center gap-2">
              <input
                style={{ ...inputStyle, flex: 1 }} value={msgInput} placeholder="Напишите сообщение…"
                onChange={(e) => setMsgInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              />
              <button
                onClick={sendMessage} disabled={sending || !msgInput.trim()}
                style={{ background: COLORS.deep, borderRadius: 8, padding: '9px 12px' }}
                className="flex items-center justify-center"
              >
                {sending ? <Loader2 className="animate-spin" size={16} color={COLORS.white} /> : <Send size={16} color={COLORS.white} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
