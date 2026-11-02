# 🌌 Astro-Kalender Voting-App

Eine moderne, responsive Single-Page-Webanwendung (SPA) zur Community-Bewertung von Astrofotografien für einen Jahreskalender – optimiert für **GitHub Pages** und **Supabase** (PostgreSQL & Storage).

---

## ✨ Features im Überblick

### 1. Öffentlicher Abstimmungsbereich
* **Astro-Dark Theme:** Tiefer Nachthimmel (`#060911` / `#0a0e17`), Glasmorphismus, Sternennebel-Akzente und Cyan/Lime-Glow-Effekte.
* **Interaktives Voting:**
  * **👍 Gefällt mir** & **👎 Weniger** mit direktem visuellen Feedback und Netto-Zähler.
  * **Monatsempfehlung:** Dropdown zur Auswahl des besten Kalendermonats (*Januar* bis *Dezember*) oder *„Keine Präferenz“*.
* **Nutzer-Identifikation & Wiederaufnahme:**
  * Beim ersten Klick auf ein Vote-Element öffnet sich ein elegantes Modal zur Eingabe von Name & E-Mail.
  * Daten werden in `localStorage` hinterlegt. Bei erneutem Besuch oder erneuter Eingabe derselben E-Mail werden bisherige Stimmen automatisch geladen und können korrigiert werden (keine Doppelstimmen).
* **Live-Fortschritt:**
  * Fortschrittsbalken im Header & Hero (*„Du hast 8 von 12 Bildern bewertet“*).
  * Filter nach *Alle*, *Noch offen* und *Bereits bewertet*.
  * Sortierung nach Standard, Beliebteste (Netto-Votes) oder Titel.
  * Konfetti-Animation beim vollständigen Abschluss aller Bewertungen!
* **Fullscreen-Lightbox:**
  * Klick auf ein Bild öffnet eine detailreiche Großansicht mit Zoom, EXIF/Aufnahmedaten (Teleskop, Belichtung, Fotograf) und Tastaturnavigation (<kbd>ESC</kbd>, <kbd>←</kbd>, <kbd>→</kbd>).
  * Direktes Abstimmen auch innerhalb der Lightbox möglich.

---

### 2. Geheimer Admin-Bereich (`/#admin`)
* **Zugang:** Nur über die Route `/#admin` (oder den diskreten Link im Footer) mit Passwort-Schutz aufrufbar (Standard-PIN: `astro2026`).
* **Clientseitiges Pre-Processing vor dem Upload:**
  * Große Astrofotos (10–50 MB) werden vor dem Upload im Browser per JavaScript (HTML5 Canvas) automatisch auf maximal **1920 × 1080 px** (unter Beibehaltung des Seitenverhältnisses, Contain) skaliert und als **JPEG bei 85% Qualität** komprimiert.
  * **Vorher-Nachher-Anzeige:** Direkte Gegenüberstellung der Dateigrößen und Ersparnis (z. B. *„14,2 MB ➔ 380 KB (-97%)“*) sowie Bildvorschau.
* **Foto-Metadaten:**
  * Titel des Objekts, Fotograf, Teleskop / Optik, Belichtungszeit und Beschreibung.
* **Admin-Dashboard & Auswertungen:**
  * **Rangliste:** Sortiert nach Netto-Upvotes (👍 minus 👎).
  * **Monats-Verteilungsdiagramm:** Interaktive Balken für die empfohlenen Kalendermonate pro Foto (z. B. *„70 % empfehlen Oktober“*).
  * **Wähler-Liste:** Übersicht aller teilnehmenden Wähler (Name, E-Mail, Anzahl abgegebener Stimmen, Zeitstempel).
  * **Verwaltung:** Bearbeiten und Löschen hochgeladener Fotos.

---

### 3. Demo- & Offline-Modus
* Die App verfügt über einen **voll funktionsfähigen Demo-Modus mit vorinstallierten Astrofotos** (Andromeda-Galaxie, Orionnebel, Plejaden etc.) und Beispieldaten im Browser (`localStorage`).
* Du kannst die gesamte Anwendung, inklusive Canvas-Kompression, Voting, Lightbox und Admin-Bereich, sofort ohne externen Account testen!
* Sobald Supabase eingerichtet ist, wechselt die App nahtlos in den Live-Cloud-Modus.

---

## 🚀 Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktions-Build erstellen
npm run build

# Gebauten Build lokal testen
npm run preview
```

---

## 🌐 Deployment auf GitHub Pages

Ein fertiger GitHub Actions Workflow ist unter `.github/workflows/deploy.yml` hinterlegt.

1. **Repository auf GitHub pushen:**
   ```bash
   git add .
   git commit -m "Initial commit Astro-Kalender Voting App"
   git push origin main
   ```
2. **GitHub Pages aktivieren:**
   * Gehe in deinem GitHub-Repository auf **Settings** ➔ **Pages**.
   * Wähle unter **Build and deployment** ➔ **Source** die Option **GitHub Actions** aus.
3. Bei jedem Push auf den `main`-Branch baut GitHub Actions das Projekt automatisch und veröffentlicht es auf deiner GitHub Pages URL (z. B. `https://<dein-nutzername>.github.io/<repo-name>/`).
4. Durch `base: './'` in `vite.config.ts` funktioniert das Hosting in jedem Unterverzeichnis reibungslos.

---

## 🗄️ Backend & Datenbank (Supabase Setup)

1. Erstelle ein kostenloses Projekt auf [supabase.com](https://supabase.com).
2. Öffne den **SQL Editor** im Supabase-Dashboard.
3. Kopiere den gesamten Inhalt der Datei [`supabase/schema.sql`](./supabase/schema.sql) hinein und klicke auf **Run**.
   * Dadurch werden die Tabellen `photos`, `voters`, `votes`, die Aggregation-View `photo_voting_summary`, alle Row-Level-Security (RLS) Policies und der Storage-Bucket `photos` automatisch angelegt.
4. **Verbindung herstellen:**
   * **Option A (im Web-UI):** Klicke oben rechts auf das Datenbank-Icon (*„Demo Modus“*) und trage deine Supabase URL und deinen `anon public key` ein.
   * **Option B (über .env / GitHub Secrets):** Lege eine `.env`-Datei an:
     ```env
     VITE_SUPABASE_URL=https://xyzcompany.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
     Für GitHub Pages kannst du dieselben Werte unter **Settings ➔ Secrets and variables ➔ Actions** als Repository Secrets hinterlegen.

---

## 📁 Projektstruktur

```
astrovote/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automatisches GitHub Pages Deployment
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx  # Geheimer Admin-Bereich mit Upload & Diagrammen
│   │   ├── Lightbox.tsx        # Fullscreen-Betrachter mit Tastatur-Steuerung
│   │   ├── Navbar.tsx          # Sticky Header mit Brand, Fortschritt & Login
│   │   ├── PhotoCard.tsx       # Fotokarte mit Voting (👍/👎) und Monatsauswahl
│   │   ├── SupabaseConfigModal.tsx # Supabase Verbindung & Test
│   │   ├── Toast.tsx           # Feedback-Benachrichtigungen
│   │   └── VoterModal.tsx      # Namens- & E-Mail-Abfrage vor Stimmabgabe
│   ├── lib/
│   │   ├── api.ts              # Datenbank- & Storage-Schnittstelle (Supabase / Local)
│   │   ├── imageCompressor.ts  # Clientseitige 1080p Canvas-Kompression (JPEG 85%)
│   │   └── mockData.ts         # Vorinstallierte Astro-Beispieldaten
│   ├── types/
│   │   └── index.ts            # TypeScript Typendefinitionen
│   ├── App.tsx                 # Hauptanwendung mit Filter, Sortierung & Confetti
│   ├── index.css               # Deep Space Dark Stylesheet
│   ├── main.tsx                # React Root Mount
│   └── vite-env.d.ts           # Vite Umgebungstypen
├── supabase/
│   └── schema.sql              # SQL Schema, Views, RLS & Storage Bucket
├── index.html                  # HTML5 Template mit Deep Space Google Fonts
├── package.json
├── tailwind.config.js
├── vite.config.ts              # Vite Config mit relativem Base-Path
└── prompt-astro-voting.md
```

