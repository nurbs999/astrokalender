# Astro-Kalender Voting-App (GitHub Pages + Serverless DB)

Erstelle eine moderne, responsive Single-Page-Webanwendung (SPA), die über **GitHub Pages** gehostet werden kann und ein serverloses Backend (z. B. **Supabase** oder **Firebase Firestore & Storage**) als kleine Datenbank und Bilderspeicher nutzt.

---

## 1. Projektziel & Konzept
Ziel ist es, Astrofotografien für einen Jahreskalender durch eine Community bewerten zu lassen:
1. **Bewertung:** Jedes Foto kann mit **Daumen hoch (👍)** oder **Daumen runter (👎)** bewertet werden.
2. **Monatsempfehlung:** In einer Auswahlliste / Spalte schlägt der Nutzer vor, für welchen Kalendermonat (**Januar bis Dezember**) das jeweilige Bild am besten geeignet ist.
3. **Nutzer-Identifikation:** Bevor Bewertungen gespeichert werden, muss der Nutzer einmalig **Name** und **E-Mail-Adresse** eingeben. Über die E-Mail-Adresse werden die Bewertungen in der Datenbank verknüpft, sodass ein Nutzer seine Auswahl jederzeit wieder aufrufen und anpassen kann.

---

## 2. Technischer Stack & Hosting
* **Hosting:** GitHub Pages (reines statisches Bundle, z. B. mit Vite + Vanilla TypeScript/React/Svelte oder reinem modernem HTML5/ES Modules).
* **Backend & Datenbank:** Supabase (PostgreSQL + Storage) oder Firebase (Firestore + Storage), da GitHub Pages kein serverseitiges Node/PHP ausführen kann und clientseitig über API-Keys mit Row-Level-Security (RLS) kommuniziert werden muss.
* **Styling:** Modernes, minimalistisches Dark-Theme (Astro-/Space-Ästhetik: Deep Space Dark `#0a0e17`, Sternen-Akzente, Glasmorphismus, flüssige Animationen). Vollständig responsive für Smartphone, Tablet und Desktop.

---

## 3. Kernfunktionen im Detail

### A. Geheimer Admin-Bereich (Bild-Upload & Verwaltung)
* **Zugang:** Nur über eine geheime URL aufrufbar (z. B. `/admin.html` oder Route `/#admin` mit Token/Passwort-Abfrage), nicht in der öffentlichen Navigation sichtbar.
* **Clientseitiges Pre-Processing vor dem Upload (Sehr wichtig!):**
  * Originalfotos können mehrere Megabyte groß sein (10–50 MB).
  * Bevor ein Bild an den Storage gesendet wird, muss es im Browser per JavaScript (HTML5 Canvas / `ImageBitmap`) clientseitig verkleinert werden:
    * **Maximale Auflösung:** 1920 × 1080 px (unter Beibehaltung des Seitenverhältnisses, Contain).
    * **Format & Kompression:** JPEG, Qualität ca. 85%.
    * **Vorher-Nachher-Anzeige:** Anzeige der Dateigröße vor und nach der Kompression (z. B. *„14,2 MB ➔ 380 KB (-97%)“*).
* **Foto-Metadaten:**
  * Titel des Objekts (z. B. *„Andromeda-Galaxie (M31)“*).
  * Fotograf / Aufnahme-Details (optional: Teleskop, Belichtungszeit).
* **Admin-Dashboard / Auswertung:**
  * Übersicht aller Fotos sortiert nach Netto-Upvotes (👍 minus 👎).
  * Diagramm/Balken für die vorgeschlagenen Kalendermonate pro Foto (z. B. *„70 % empfehlen Oktober“*).
  * Liste der teilnehmenden Wähler (Name + E-Mail) mit Timestamp.
  * Lösch- und Bearbeiten-Funktion für hochgeladene Bilder.

### B. Öffentlicher Abstimmungsbereich (Voting)
* **Galerie / Feed:**
  * Übersichtliche Kartenansicht oder Listenansicht der Astrofotos.
  * Klick auf ein Bild öffnet eine Fullscreen-Lightbox zur Betrachtung feiner Bilddetails.
* **Interaktives Voting pro Foto:**
  * Buttons für **Daumen hoch** und **Daumen runter** mit aktuellem Status (Hervorhebung der eigenen Wahl).
  * Dropdown oder Klick-Pills für die **Monatsauswahl** (*Januar* bis *Dezember* oder *„Keine Präferenz“*).
* **Identifikation & Wiederaufnahme:**
  * Beim ersten Klick auf ein Vote-Element öffnet sich ein elegantes Modal: Eingabe von **Name** und **E-Mail**.
  * Die Daten werden im Browser (`localStorage`) gemerkt, damit der Nutzer flüssig weiter abstimmen kann.
  * Beim erneuten Besuch der Seite (oder Eingabe derselben E-Mail) werden seine bisherigen Stimmen automatisch aus der Datenbank geladen und können korrigiert werden (keine doppelten Stimmen pro E-Mail).
* **Feedback & Live-Zähler:**
  * Dezentes Feedback bei erfolgreicher Speicherung (*„Stimme für Andromeda-Galaxie gespeichert“*).
  * Fortschrittsbalken oben: *„Du hast 8 von 12 Bildern bewertet“*.

---

## 4. Datenbank-Schema (Entwurf)

1. **`photos`**
   * `id` (UUID / Auto-ID)
   * `title` (Text)
   * `author` (Text)
   * `image_url` (Text, Public Storage URL)
   * `created_at` (Timestamp)

2. **`voters`**
   * `id` (UUID / E-Mail)
   * `email` (Text, Unique)
   * `name` (Text)
   * `created_at` (Timestamp)

3. **`votes`**
   * `id` (UUID)
   * `photo_id` (Foreign Key -> photos.id)
   * `voter_email` (Foreign Key -> voters.email)
   * `rating` (`'up'` | `'down'` | `'none'`)
   * `suggested_month` (1 bis 12 oder null)
   * `updated_at` (Timestamp)
   * *Constraint:* Unique auf `(photo_id, voter_email)` – jeder Nutzer hat pro Foto genau einen Datensatz, der aktualisiert wird.

---

## 5. UI/UX & Design-Vorgaben
* **Look & Feel:** Dunkler Nachthimmel-Look (`#0b0f19`), dezente Rahmen (`rgba(255,255,255,0.1)`), leuchtendes Cyan/Lime als Akzentfarbe für aktive Buttons.
* **Performance:** Sofortige Ladezeiten dank der auf 1080p komprimierten Bilder und `loading="lazy"` in der Galerie.
* **Barrierefreiheit:** Tastatur-Navigation, aussagekräftige ARIA-Labels für Daumen-Buttons und Lightbox.

---

## 6. Bitte erstelle:
1. Eine vollständige Projektstruktur inklusive Build-Setup für GitHub Pages.
2. Den HTML/JS/CSS-Code für Frontend, Lightbox, Voting-Logik und den geheimen Admin-Upload (inkl. Canvas-Komprimierung).
3. Das SQL-Schema bzw. die Konfigurationsanleitung für die Datenbank (Supabase oder Firebase) inklusive Row-Level-Security-Regeln, damit Besucher nur eigene Votes schreiben, aber alle aggregierten Daten sehen können.

