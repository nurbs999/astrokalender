-- ==============================================================================
-- ASTRO-KALENDER VOTING: SUPABASE SQL SCHEMA & RLS POLICIES
-- ==============================================================================
-- Kopiere dieses Skript in das Supabase Dashboard unter "SQL Editor" und führe es aus.
-- ==============================================================================

-- 1. Tabellen erstellen
-- ------------------------------------------------------------------------------

-- Tabelle: Fotos
CREATE TABLE IF NOT EXISTS public.photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    image_url TEXT NOT NULL,
    telescope TEXT,
    exposure TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabelle: Wähler (Voters)
CREATE TABLE IF NOT EXISTS public.voters (
    id UUID DEFAULT gen_random_uuid(),
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabelle: Stimmen (Votes)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    voter_email TEXT NOT NULL REFERENCES public.voters(email) ON UPDATE CASCADE ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('up', 'down', 'none')),
    suggested_month INTEGER CHECK (suggested_month IS NULL OR (suggested_month >= 1 AND suggested_month <= 12)),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_photo_voter UNIQUE (photo_id, voter_email)
);

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_votes_photo_id ON public.votes(photo_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_email ON public.votes(voter_email);

-- ------------------------------------------------------------------------------
-- 2. Hilfs-View für aggregierte Auswertungen (Admin & Gallery)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.photo_voting_summary AS
SELECT 
    p.id AS photo_id,
    p.title,
    p.author,
    p.image_url,
    p.created_at,
    COUNT(CASE WHEN v.rating = 'up' THEN 1 END) AS upvotes,
    COUNT(CASE WHEN v.rating = 'down' THEN 1 END) AS downvotes,
    (COUNT(CASE WHEN v.rating = 'up' THEN 1 END) - COUNT(CASE WHEN v.rating = 'down' THEN 1 END)) AS net_votes,
    COUNT(v.id) AS total_votes
FROM 
    public.photos p
LEFT JOIN 
    public.votes v ON p.id = v.photo_id
GROUP BY 
    p.id, p.title, p.author, p.image_url, p.created_at;

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) aktivieren & Policies definieren
-- ------------------------------------------------------------------------------
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- POLICIES FÜR PHOTOS:
-- Jeder darf Fotos ansehen
DROP POLICY IF EXISTS "Fotos öffentlich lesbar" ON public.photos;
CREATE POLICY "Fotos öffentlich lesbar"
    ON public.photos FOR SELECT
    TO anon, authenticated
    USING (true);

-- Fotos erstellen, ändern, löschen (im Client mit Anon Key oder Admin)
DROP POLICY IF EXISTS "Fotos verwalten" ON public.photos;
CREATE POLICY "Fotos verwalten"
    ON public.photos FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- POLICIES FÜR VOTERS:
-- Wähler-Daten lesbar
DROP POLICY IF EXISTS "Wähler lesbar" ON public.voters;
CREATE POLICY "Wähler lesbar"
    ON public.voters FOR SELECT
    TO anon, authenticated
    USING (true);

-- Wähler können sich registrieren / aktualisieren
DROP POLICY IF EXISTS "Wähler upsert" ON public.voters;
CREATE POLICY "Wähler upsert"
    ON public.voters FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- POLICIES FÜR VOTES:
-- Stimmen öffentlich lesbar (für Aggregation und Auswertung)
DROP POLICY IF EXISTS "Stimmen öffentlich lesbar" ON public.votes;
CREATE POLICY "Stimmen öffentlich lesbar"
    ON public.votes FOR SELECT
    TO anon, authenticated
    USING (true);

-- Stimmen einfügen / aktualisieren (Upsert pro Wähler-E-Mail)
DROP POLICY IF EXISTS "Stimmen speichern und ändern" ON public.votes;
CREATE POLICY "Stimmen speichern und ändern"
    ON public.votes FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. Supabase Storage Bucket Konfiguration
-- ------------------------------------------------------------------------------
-- Führe dies aus, um den Storage Bucket "photos" anzulegen und freizugeben:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Jeder darf Fotos ansehen
DROP POLICY IF EXISTS "Öffentlicher Lesezugriff auf Fotos" ON storage.objects;
CREATE POLICY "Öffentlicher Lesezugriff auf Fotos"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'photos');

-- Storage RLS: Uploads in den photos Bucket erlauben
DROP POLICY IF EXISTS "Uploads in photos erlauben" ON storage.objects;
CREATE POLICY "Uploads in photos erlauben"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "Löschen von Fotos erlauben" ON storage.objects;
CREATE POLICY "Löschen von Fotos erlauben"
    ON storage.objects FOR DELETE
    TO anon, authenticated
    USING (bucket_id = 'photos');

