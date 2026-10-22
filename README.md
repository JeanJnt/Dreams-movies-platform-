# Dreams 夢

**A private cinema journal for a small circle of friends** — think Letterboxd, but invite-only, built around long-form reviews, a physical DVD/Blu-ray collection and film-inspired themes.

Dreams is a Progressive Web App (PWA): one codebase that installs like a native app on **Windows, macOS, Android and iOS**.

> The name comes from Akira Kurosawa's *Dreams* (夢, *Yume*, 1990). The logo is the kanji 夢 drawn with a brush, generated from the open-source font [Yuji Boku](https://fonts.google.com/specimen/Yuji+Boku) (`scripts/make-logo.ts`).

---

## Features

**Your films**
- **Letterboxd import** — upload your Letterboxd export (.zip) from the app: watched films, ratings, likes, diary, reviews, watchlist and lists. Re-import anytime.
- **Film pages** — poster, synopsis, director, cast, genres (in French, via TMDB), where to stream legally in France, soundtrack on Deezer, links to the best critics (DVDClassik, Critikat, Cahiers du cinéma, RogerEbert.com, Criterion…) and video essays from trusted sources only (Arte, Cahiers du cinéma, Cinémathèque française, Criterion, Every Frame a Painting…).
- **Long-form reviews** — a writing editor (title, lede, rating, headings, quotes, autosave, drafts), a magazine-style reading page and a shareable card in Instagram format. Each review is **private** or **visible to members**.
- **Letterboxd reviews vs. Dreams reviews** — imported Letterboxd reviews and reviews written on Dreams are always clearly distinguished.
- **Custom posters** — pick any poster from TMDB (FR, EN, JA, textless…) or upload your own.
- **Gallery** — add your own photos and videos to any film, shared with members or kept private.

**Discover**
- **Recommendations** — computed from your favourite films and your taste profile (genres, directors), or a ranking of your watchlist. Filter by streaming platform (Netflix, Prime Video, Canal+, HBO Max…), runtime, genre and decade.
- **"At the cinema" alerts** — get notified when a film from your watchlist or favourites is showing, coming soon or re-released in theatres, with links to Paris showtimes (Allociné, Paris Ciné Info). Updated automatically every morning.
- **Directors & actors** — your most-watched people, and a page for each with biography, filmography and what you've seen.

**Your collection**
- **Physical collection** — format (4K, Blu-ray, DVD…), case type (standard, steelbook, digipack, box set), edition (Criterion, Carlotta…) and a photo of your actual cover.
- **Barcode scanner** — scan a disc with your phone camera to add it in seconds.
- **Three views** — 3D cases that open to reveal the disc, a shelf of spines, and an A24-style disc carousel with printed disc labels.

**Stats & agenda**
- **Stats** — films per month, ratings, decades, genres, countries, directors, actors, records, and a **timeline** of your years in cinema.
- **Agenda** — plan screenings (at the cinema or at home), subscribe from your phone's calendar via a private link.

**Community (Letterboxd-style)**
- **Member profiles**, an **activity feed**, and on every film what other members thought (ratings, reviews, Dreams reviews).

**Seven film-inspired themes**

| Theme | Film | Look |
|---|---|---|
| **夢 Yume** | *Dreams* ("Crows"), Kurosawa | Van Gogh cobalt sky, chrome-yellow wheat, crows |
| **トトロ** | *My Neighbor Totoro*, Miyazaki | Summer sky, clouds, camphor-tree green, soot sprites |
| **Twin Peaks** | *Fire Walk with Me*, Lynch | The Red Room: velvet curtains, chevron floor |
| **Pierrot** | *Pierrot le Fou*, Godard | Brutalist red and blue, huge chunky type |
| **花樣年華** | *In the Mood for Love*, Wong Kar-wai | Blood red, amber light, Bodoni italics |
| **2001** | *2001: A Space Odyssey*, Kubrick | Clinical white, wide capitals, HAL's red eye |
| **Close-Up** | *Close-Up*, Kiarostami | Sand and ochre, the Koker zigzag, Persian poster type |

---

## Install the app

Dreams is a web app you install from your browser. Open your Dreams address (for example `https://your-dreams.vercel.app`), sign in, then:

### 📱 iPhone / iPad (iOS)
1. Open Dreams in **Safari**.
2. Tap the **Share** button (square with an arrow), then **Add to Home Screen**.
3. Tap **Add**. Dreams opens full screen, like a native app.

### 🤖 Android
1. Open Dreams in **Chrome**.
2. Tap **Install app** on the *Install* page, or the **⋮** menu → **Install app**.
3. Long-press the icon for shortcuts: Recommendations, Scanner, Agenda, At the cinema.

### 🪟 Windows
1. Open Dreams in **Chrome** or **Edge**.
2. Click the **install icon** in the address bar (or the *Install app* button on the *Install* page).
3. Dreams opens in its own window and appears in the Start menu — pin it to the taskbar.

### 🍎 macOS
- **Safari**: menu **File → Add to Dock**.
- **Chrome**: click the **install icon** in the address bar.

Tip: press **/** anywhere to search for a film. Dreams also works offline for the pages you've already opened.

---

## Security & privacy

- **Invite-only** sign-up (10 members max). The first account becomes the administrator.
- Passwords hashed with **scrypt**; sessions in an **HttpOnly** cookie, only a SHA-256 fingerprint is stored; rate-limited login.
- **Strict per-member isolation**: every query is scoped to the signed-in member; ownership is checked on every write.
- Private reviews and media are never visible to others. Files are stored **privately** and only served to authorised members.
- Security headers (anti-clickjacking, same-origin forms, camera limited to the scanner).
- Every member can **export all their data** (JSON) or **delete their account**.
- API keys and personal data never go to GitHub (`.env.local` and `/data` are git-ignored).

---

## Tech stack

[Next.js 15](https://nextjs.org) (App Router, Server Components, Server Actions) · TypeScript · Tailwind CSS 4 · SQLite / [Turso](https://turso.tech) (libSQL) · [Vercel Blob](https://vercel.com/docs/vercel-blob) · TMDB API · YouTube Data API · Deezer API

---

## Run it locally

Requirements: [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/JeanJnt/Dreams-movies-platform-.git
cd Dreams-movies-platform-
npm install
cp .env.example .env.local   # then add your TMDB and YouTube API keys
npm run dev
```

Open http://localhost:3000, create the first (administrator) account, then go to **My account → Import from Letterboxd** (Letterboxd → Settings → Import & Export → Export your data).

Useful scripts:

| Command | What it does |
|---|---|
| `npm run enrich` | Fills in film details from TMDB |
| `npm run reco -- --email you@example.com` | Recomputes a member's recommendations |
| `npm run alertes` | Checks "at the cinema" alerts for every member |
| `npm run vers-turso` | Copies the local database to Turso (one-off, before going online) |

## Deploy (Vercel + Turso + Vercel Blob)

1. Create a database on **Turso** and copy its URL and a token.
2. Import this repository on **Vercel**, then add the environment variables:
   `DATABASE_URL` (Turso URL), `DATABASE_AUTH_TOKEN`, `TMDB_API_KEY`, `YOUTUBE_API_KEY`, `CRON_SECRET` (any long random string).
3. In Vercel → **Storage**, create a **Blob** store and connect it to the project (this adds `BLOB_READ_WRITE_TOKEN`).
4. Deploy, open the site and create your administrator account.

---

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data by JustWatch. Soundtracks via Deezer. Video essays via YouTube. Showtimes: Allociné, Paris Ciné Info.
