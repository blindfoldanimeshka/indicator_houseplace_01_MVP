-- =============================================
-- напрямую — Supabase schema
-- =============================================

-- 1. Пользователи (связаны с auth.users через id)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Автоматическое создание профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, city)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.raw_user_meta_data->>'city', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Объявления
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('offer', 'request')),
  city VARCHAR(100) NOT NULL,
  rooms VARCHAR(20) NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  area INTEGER CHECK (area > 0),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_listings_city ON public.listings(city);
CREATE INDEX idx_listings_type ON public.listings(type);
CREATE INDEX idx_listings_price ON public.listings(price);
CREATE INDEX idx_listings_rooms ON public.listings(rooms);
CREATE INDEX idx_listings_created ON public.listings(created_at DESC);
CREATE INDEX idx_listings_author ON public.listings(author_id);

-- 3. Чаты
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Участники чата
CREATE TABLE public.chat_participants (
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, user_id)
);

-- 5. Сообщения
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_chat ON public.messages(chat_id, created_at);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users: читать все, писать только свой профиль
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);

-- Listings: читать все (кроме удалённых), создавать/удалять только авторизованные
CREATE POLICY "Listings are viewable by everyone"
  ON public.listings FOR SELECT USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create listings"
  ON public.listings FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own listings"
  ON public.listings FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own listings"
  ON public.listings FOR DELETE USING (auth.uid() = author_id);

-- Chats: видят только участники
CREATE POLICY "Chats viewable by participants"
  ON public.chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create chats"
  ON public.chats FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Chat participants: видят только свои
CREATE POLICY "Participants viewable by chat members"
  ON public.chat_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can add participants"
  ON public.chat_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Messages: видят только участники чата
CREATE POLICY "Messages viewable by chat participants"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_participants
      WHERE chat_id = messages.chat_id AND user_id = auth.uid()
    )
  );
