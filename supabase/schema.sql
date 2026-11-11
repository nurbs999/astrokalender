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

-- Tabelle: Wähler (Voters) mit E-Mail-Verifizierung
CREATE TABLE IF NOT EXISTS public.voters (
    id UUID DEFAULT gen_random_uuid(),
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    verification_code TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Falls Tabelle voters bereits existiert, Spalten nachrüsten:
ALTER TABLE public.voters ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.voters ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.voters ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Tabelle: Stimmen (Votes) - suggested_month: 0 = Deckblatt, 1..12 = Januar..Dezember
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    voter_email TEXT NOT NULL REFERENCES public.voters(email) ON UPDATE CASCADE ON DELETE CASCADE,
    rating TEXT NOT NULL CHECK (rating IN ('up', 'down', 'none')),
    suggested_month INTEGER CHECK (suggested_month IS NULL OR (suggested_month >= 0 AND suggested_month <= 12)),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_photo_voter UNIQUE (photo_id, voter_email)
);

-- Falls Tabelle votes bereits mit altem Constraint (1..12) existiert, auf 0..12 (inkl. Deckblatt = 0) erweitern:
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_suggested_month_check;
ALTER TABLE public.votes ADD CONSTRAINT votes_suggested_month_check CHECK (suggested_month IS NULL OR (suggested_month >= 0 AND suggested_month <= 12));

-- Indizes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_votes_photo_id ON public.votes(photo_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_email ON public.votes(voter_email);

-- ------------------------------------------------------------------------------
-- 2. Hilfs-View für aggregierte Auswertungen (NUR VERIFIZIERTE WÄHLER ZÄHLEN)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.photo_voting_summary AS
SELECT 
    p.id AS photo_id,
    p.title,
    p.author,
    p.image_url,
    p.created_at,
    COUNT(CASE WHEN v.rating = 'up' AND vt.is_verified = true THEN 1 END) AS upvotes,
    COUNT(CASE WHEN v.rating = 'down' AND vt.is_verified = true THEN 1 END) AS downvotes,
    (COUNT(CASE WHEN v.rating = 'up' AND vt.is_verified = true THEN 1 END) - COUNT(CASE WHEN v.rating = 'down' AND vt.is_verified = true THEN 1 END)) AS net_votes,
    COUNT(CASE WHEN vt.is_verified = true THEN v.id END) AS total_votes
FROM 
    public.photos p
LEFT JOIN 
    public.votes v ON p.id = v.photo_id
LEFT JOIN
    public.voters vt ON v.voter_email = vt.email
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

-- ------------------------------------------------------------------------------
-- 5. Admin-Konfiguration & Passwort-Prüfung in Supabase (mit Bcrypt-Verschlüsselung)
-- ------------------------------------------------------------------------------
-- pgcrypto Erweiterung für kryptografisches Hashing (bcrypt) aktivieren
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabelle für Einstellungen (Admin-Passwort-Hash)
CREATE TABLE IF NOT EXISTS public.admin_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS aktivieren: Die Tabelle ist NICHT öffentlich lesbar (weder per anon noch per authenticated)
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

-- Automatischer Hashing-Trigger:
-- Du kannst das Passwort weiterhin als ganz normales Wort in der Supabase-UI eintragen!
-- Dieser Trigger wandelt es beim Speichern automatisch in einen sicheren Bcrypt-Hash ($2a$...) um!
CREATE OR REPLACE FUNCTION public.hash_admin_password_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Nur hashen, wenn es sich um das Admin-Passwort handelt und es noch kein Bcrypt-Hash ist
    IF NEW.key = 'admin_password' AND NEW.value NOT LIKE '$2%' THEN
        NEW.value := crypt(NEW.value, gen_salt('bf', 10));
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_admin_password ON public.admin_config;
CREATE TRIGGER trg_hash_admin_password
BEFORE INSERT OR UPDATE ON public.admin_config
FOR EACH ROW
EXECUTE FUNCTION public.hash_admin_password_trigger();

-- Initiales Standardpasswort setzen (wird durch den Trigger sofort gehasht!)
INSERT INTO public.admin_config (key, value)
VALUES ('admin_password', 'astro2025!')
ON CONFLICT (key) DO NOTHING;

-- Sichere Verifizierungsfunktion (SECURITY DEFINER = läuft mit Rechten des Datenbankbesitzers)
-- Gibt NUR true oder false zurück, niemals das Passwort oder den Hash!
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stored_val TEXT;
BEGIN
    SELECT value INTO stored_val FROM public.admin_config WHERE key = 'admin_password';
    IF stored_val IS NULL THEN
        -- Fallback, falls die Zeile noch nicht existiert
        RETURN input_password = 'admin';
    END IF;
    
    -- 1. Prüfung gegen Bcrypt-Hash ($2a$, $2b$, $2y$)
    IF stored_val LIKE '$2%' THEN
        RETURN stored_val = crypt(input_password, stored_val);
    END IF;

    -- 2. Fallback für ältere Klartext-Einträge
    RETURN stored_val = input_password;
END;
$$;

-- Sichere Funktion zum Ändern des Admin-Passworts aus der App heraus
CREATE OR REPLACE FUNCTION public.set_admin_password(new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF new_password IS NULL OR length(trim(new_password)) < 3 THEN
        RAISE EXCEPTION 'Passwort muss mindestens 3 Zeichen lang sein';
    END IF;
    
    INSERT INTO public.admin_config (key, value, updated_at)
    VALUES ('admin_password', trim(new_password), timezone('utc'::text, now()))
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, updated_at = timezone('utc'::text, now());
    
    RETURN true;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Kalender-Kuration (Feste Monats- & Deckblatt-Auswahl durch Admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_selections (
    slot INTEGER PRIMARY KEY CHECK (slot >= 0 AND slot <= 12),
    photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS aktivieren
ALTER TABLE public.calendar_selections ENABLE ROW LEVEL SECURITY;

-- Jeder darf die festgelegte Kalenderauswahl einsehen
DROP POLICY IF EXISTS "Kalender-Auswahl öffentlich lesbar" ON public.calendar_selections;
CREATE POLICY "Kalender-Auswahl öffentlich lesbar"
    ON public.calendar_selections FOR SELECT
    TO anon, authenticated
    USING (true);

-- Festlegungen speichern / ändern / löschen
DROP POLICY IF EXISTS "Kalender-Auswahl verwalten" ON public.calendar_selections;
CREATE POLICY "Kalender-Auswahl verwalten"
    ON public.calendar_selections FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

