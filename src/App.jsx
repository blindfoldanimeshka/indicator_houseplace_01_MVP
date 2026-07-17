import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home, Search, MessageCircle, Plus, X, MapPin, Send, User,
  Trash2, ChevronLeft, SlidersHorizontal, Loader2, Pencil, Inbox, LogOut
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { formatPrice, timeAgo, validateForm } from './lib/utils';
import Auth from './components/Auth';
import { fetchListings, createListing, deleteListing, fetchMyListings } from './api/listings';
import { fetchChats, openOrCreateChat, fetchThread, sendMessage as apiSendMessage, subscribeToChat } from './api/chats';

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

function Skeleton({ width = '100%', height = 16, borderRadius = 6, style = {} }) {
  return (
    <div
      style={{
        width, height, borderRadius,
        background: `linear-gradient(90deg, ${COLORS.paperSoft} 25%, ${COLORS.border} 50%, ${COLORS.paperSoft} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

function ListingSkeleton() {
  return (
    <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderLeft: `4px solid ${COLORS.border}`, borderRadius: 10, padding: '16px 18px' }} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton width={80} height={22} borderRadius={999} />
        <Skeleton width={100} height={18} />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={120} height={14} />
        <Skeleton width={60} height={14} />
      </div>
      <Skeleton width="80%" height={14} />
      <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
        <Skeleton width={140} height={12} />
        <Skeleton width={80} height={12} />
      </div>
    </div>
  );
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
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);

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
  const [formErrors, setFormErrors] = useState({});
  const [posting, setPosting] = useState(false);

  const [myListings, setMyListings] = useState([]);
  const [toast, setToast] = useState(null);

  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [activeConv, setActiveConv] = useState(null);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const unsubRef = useRef(null);
  const threadEndRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error || !data) {
        console.error('Failed to load profile:', error);
        setProfile(null);
      } else {
        setProfile({ userId: data.id, name: data.name, city: data.city });
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
      setProfile(null);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  async function saveProfileEdits() {
    const newName = editName.trim() || profile.name;
    const newCity = editCity.trim();
    try {
      const { error } = await supabase.from('users').update({ name: newName, city: newCity }).eq('id', profile.userId);
      if (error) {
        console.error('Failed to save profile:', error);
        showToast('Не удалось сохранить профиль');
        return;
      }
      setProfile({ ...profile, name: newName, city: newCity });
      setEditingProfile(false);
    } catch (e) {
      console.error('Failed to save profile:', e);
      showToast('Не удалось сохранить профиль');
    }
  }

  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const items = await fetchListings({
        type: filterType,
        city: filterCity,
        rooms: filterRooms,
        maxPrice: filterMaxPrice,
      });
      setListings(items);
    } catch (e) {
      console.error('Failed to load listings:', e);
      showToast('Не удалось загрузить объявления');
    }
    setListingsLoading(false);
  }, [filterType, filterCity, filterRooms, filterMaxPrice]);

  const loadMyListings = useCallback(async () => {
    if (!profile) return;
    setListingsLoading(true);
    try {
      const items = await fetchMyListings(profile.userId);
      setMyListings(items);
    } catch (e) {
      console.error('Failed to load my listings:', e);
      showToast('Не удалось загрузить ваши объявления');
    }
    setListingsLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profile && view === 'feed') loadListings();
    if (profile && view === 'mine') loadMyListings();
  }, [profile, view, loadListings, loadMyListings]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function validateFormLocal() {
    const errors = validateForm(form);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitListing(e) {
    e.preventDefault();
    if (!validateFormLocal()) return;
    setPosting(true);
    try {
      await createListing({
        userId: profile.userId,
        type: form.type,
        city: form.city,
        rooms: form.rooms,
        price: form.price,
        area: form.area,
        description: form.description,
      });
      setForm({ type: form.type, city: '', rooms: '1 комната', price: '', area: '', description: '' });
      setFormErrors({});
      showToast('Объявление опубликовано');
      setView('mine');
    } catch (e) {
      console.error('Failed to create listing:', e);
      showToast('Не удалось создать объявление');
    }
    setPosting(false);
  }

  async function removeListing(id) {
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
      setMyListings((prev) => prev.filter((l) => l.id !== id));
      showToast('Объявление удалено');
    } catch (e) {
      console.error('Failed to delete listing:', e);
      showToast('Не удалось удалить объявление');
    }
  }

  async function openChatWithListing(listing) {
    try {
      const chatId = await openOrCreateChat({
        listingId: listing.id,
        listingSummary: `${listing.type === 'offer' ? 'Сдаётся' : 'Ищут'} · ${listing.rooms} · ${listing.city} · ${formatPrice(listing.price)}`,
        userId: profile.userId,
        otherUserId: listing.authorId,
      });
      const thread = await fetchThread(chatId);
      setActiveConv({ chatId, thread });
      setView('thread');
    } catch (e) {
      console.error('Failed to open chat:', e);
      showToast('Не удалось открыть чат');
    }
  }

  const loadChats = useCallback(async () => {
    if (!profile) return;
    setChatsLoading(true);
    try {
      const items = await fetchChats(profile.userId);
      setChats(items);
    } catch (e) {
      console.error('Failed to load chats:', e);
      showToast('Не удалось загрузить сообщения');
    }
    setChatsLoading(false);
  }, [profile]);

  useEffect(() => {
    if (profile && view === 'chats') loadChats();
  }, [profile, view, loadChats]);

  const activeChatIdRef = useRef(null);
  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    if (view === 'thread' && activeConv) {
      activeChatIdRef.current = activeConv.chatId;
      unsubRef.current = subscribeToChat(activeConv.chatId, (msg) => {
        setActiveConv((prev) => {
          if (!prev || prev.chatId !== activeChatIdRef.current) return prev;
          return { ...prev, thread: { ...prev.thread, messages: [...prev.thread.messages, msg] } };
        });
      });
      return () => { if (unsubRef.current) unsubRef.current(); };
    }
  }, [view, activeConv?.chatId]);

  useEffect(() => {
    if (view === 'thread') threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.thread?.messages?.length, view]);

  async function sendMessage() {
    if (!msgInput.trim() || !activeConv) return;
    setSending(true);
    try {
      await apiSendMessage({ chatId: activeConv.chatId, senderId: profile.userId, text: msgInput.trim() });
      setMsgInput('');
    } catch (e) {
      console.error('Failed to send message:', e);
      showToast('Не удалось отправить сообщение');
    }
    setSending(false);
  }

  const filteredListings = listings;

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
    return <Auth />;
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: 640, ...fontBody(400) }} className="w-full flex flex-col relative">
      <style>{FONT_IMPORT}</style>

      {toast && (
        <div
          style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: COLORS.deep, color: COLORS.white, padding: '10px 20px',
            borderRadius: 8, ...fontBody(600), fontSize: 13.5, zIndex: 999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {toast}
        </div>
      )}

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
            <div className="flex items-center gap-2">
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
              <button
                onClick={handleLogout}
                style={{ ...fontBody(500), fontSize: 12.5, color: 'rgba(255,255,255,0.5)' }}
                className="flex items-center gap-1 hover:opacity-70"
                title="Выйти"
              >
                <LogOut size={13} />
              </button>
            </div>
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
              <div className="flex flex-col gap-3">
                <ListingSkeleton />
                <ListingSkeleton />
                <ListingSkeleton />
              </div>
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
              <input
                style={{ ...inputStyle, borderColor: formErrors.city ? '#A84B3A' : COLORS.border }}
                value={form.city} onChange={(e) => { setForm({ ...form, city: e.target.value }); setFormErrors((p) => ({ ...p, city: '' })); }}
                placeholder="Москва" list="cities-list"
              />
              {formErrors.city && <p style={{ ...fontBody(500), fontSize: 12, color: '#A84B3A', marginTop: 4 }}>{formErrors.city}</p>}
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
                <input
                  style={{ ...inputStyle, borderColor: formErrors.area ? '#A84B3A' : COLORS.border }}
                  type="number" value={form.area}
                  onChange={(e) => { setForm({ ...form, area: e.target.value }); setFormErrors((p) => ({ ...p, area: '' })); }}
                  placeholder="45"
                />
                {formErrors.area && <p style={{ ...fontBody(500), fontSize: 12, color: '#A84B3A', marginTop: 4 }}>{formErrors.area}</p>}
              </div>
            </div>
            <div>
              <label style={labelStyle}>{form.type === 'offer' ? 'Цена, ₽/мес' : 'Готовы платить до, ₽/мес'}</label>
              <input
                style={{ ...inputStyle, borderColor: formErrors.price ? '#A84B3A' : COLORS.border }}
                type="number" value={form.price}
                onChange={(e) => { setForm({ ...form, price: e.target.value }); setFormErrors((p) => ({ ...p, price: '' })); }}
                placeholder="45000"
              />
              {formErrors.price && <p style={{ ...fontBody(500), fontSize: 12, color: '#A84B3A', marginTop: 4 }}>{formErrors.price}</p>}
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
              <div className="flex flex-col gap-3">
                <ListingSkeleton />
                <ListingSkeleton />
              </div>
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
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '13px 16px' }} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Skeleton width={120} height={14} />
                      <Skeleton width={60} height={12} />
                    </div>
                    <Skeleton width="70%" height={12} />
                    <Skeleton width="90%" height={13} />
                  </div>
                ))}
              </div>
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
                {chats.map((chat) => {
                  const otherId = Object.keys(chat.participants).find((id) => id !== profile.userId);
                  const otherName = chat.participants[otherId] || 'Собеседник';
                  const last = chat.messages[chat.messages.length - 1];
                  return (
                    <button
                      key={chat.chatId} onClick={async () => {
                        const thread = await fetchThread(chat.chatId);
                        setActiveConv({ chatId: chat.chatId, thread });
                        setView('thread');
                      }}
                      style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '13px 16px', textAlign: 'left' }}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ ...fontBody(700), fontSize: 14, color: COLORS.ink }}>{otherName}</span>
                        <span style={{ ...fontBody(400), fontSize: 11.5, color: COLORS.muted }}>{timeAgo(last.ts)}</span>
                      </div>
                      <span style={{ ...fontBody(500), fontSize: 12, color: COLORS.muted }}>{chat.listingSummary}</span>
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
