# Dreams Movies

**A private cinema journal for a small circle of friends**: think Letterboxd, but invite-only, built around long-form reviews, a physical DVD and Blu-ray collection you can see in 3D, and screenings planned together.

### 👉 [dreams-movies-platform.vercel.app](https://dreams-movies-platform.vercel.app)

Sign-up is by invitation: ask a member for an invitation code.

Dreams is a Progressive Web App (PWA): one codebase that installs like a native app on **Windows, macOS, Android and iOS**.

---

## Features

**Your films**
- **Letterboxd import and daily sync**: upload your Letterboxd export (.zip) for your whole history (films, ratings, likes, diary, reviews, watchlist, lists), then connect your profile to fetch new films every morning.
- **Film pages**: the film's 3D DVD case, French title first with the original title underneath, synopsis, cast and crew, where to stream it legally in France, Paris showtimes, the soundtrack on Deezer, links to the best critics (DVDClassik, Critikat, Cahiers du cinéma, RogerEbert.com, Criterion…) and video essays from trusted sources only.
- **Long-form reviews**: a writing editor (title, lede, rating, headings, quotes, autosave, drafts), a magazine-style reading page and a shareable card. Each review is private or visible to friends.
- **Gallery**: add your own photos and videos to any film.

**Your collection, in 3D**
- **Physical collection**: format (4K, Blu-ray, DVD…), case type, edition, and a barcode scanner to add a disc in seconds.
- **Realistic cases and discs**: every film gets a printed jacket (front, spine, back) and a disc label based on its own images and colours, on a case of the right thickness.
- **Case and disc workshop**: customise the front, back and spine of any case and the label of its disc, with a live 3D preview. Import your own images and crop them to the exact proportions of each surface, choose a silver, colour or image background, curved or straight text, fonts and patterns. Designs are saved per member; you can go back to the previous version or reset at any time.
- **Several views**: a parade of cases that open to reveal their disc, a shelf of spines, and a disc carousel.

**Discover**
- **Recommendations**: computed from your favourite films and your taste profile, or a ranking of your watchlist, filtered by your streaming platforms, genre and decade.
- **"Now showing" alerts**: get notified when a film from your watchlist or favourites is in theatres, with links to showtimes in your city.
- **Directors & actors**: your most-watched people, and a page for each with biography and filmography.

**Friends, stats and agenda**
- **Profiles and activity feed**: what your friends watch, rate, write and collect, and on every film what they thought.
- **My 10 films**: your ten favourites, shown on the home page as ten 3D cases turning in a circle.
- **Statistics**: films per month, ratings, decades, genres, countries, directors, actors, records, and a timeline of your years in cinema.
- **Agenda**: plan screenings at the cinema or at home, and subscribe from your phone's calendar through a private link.

**Look and feel**
- A black and silver identity, with a silver 3D logo as the loading animation (lighter version on modest devices, still under reduced motion).
- Two themes: **black and white** or **black and red**. The app icon follows the theme.

---

## Install the app

Open [dreams-movies-platform.vercel.app](https://dreams-movies-platform.vercel.app), sign in, then:

### 📱 iPhone / iPad (iOS)
1. Open Dreams in **Safari**.
2. Tap the **Share** button (square with an arrow), then **Add to Home Screen**.
3. Tap **Add**. Dreams opens full screen, like a native app.

### 🤖 Android
1. Open Dreams in **Chrome**.
2. Tap **Install app** on the *Install* page, or the **⋮** menu → **Install app**.
3. Long-press the icon for shortcuts: Recommendations, Scanner, Agenda, Now showing.

### 🪟 Windows
1. Open Dreams in **Chrome** or **Edge**.
2. Click the **install icon** in the address bar (or the *Install* button on the *Install* page).
3. Dreams opens in its own window and appears in the Start menu.

### 🍎 macOS
- **Safari**: menu **File → Add to Dock**.
- **Chrome**: click the **install icon** in the address bar.

Tip: press **/** or **Ctrl K** (⌘ K on Mac) anywhere to search. Pages you've already opened stay available offline.

---

## Security & privacy

- **Invite-only** sign-up (10 members max). The first account becomes the administrator.
- Passwords hashed with **scrypt**; sessions in an **HttpOnly** cookie, only a SHA-256 fingerprint is stored; rate-limited login.
- **Strict per-member isolation**: every query is scoped to the signed-in member; ownership is checked on every write.
- Private reviews and media are never visible to others. Files are stored **privately** and only served to authorised members.
- Every member can **export all their data** or **delete their account**.
- API keys and personal data never go to GitHub (`.env.local` and `/data` are git-ignored).

---

## Tech stack

[Next.js 15](https://nextjs.org) (App Router, Server Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · [Three.js](https://threejs.org) with React Three Fiber · GSAP · SQLite / [Turso](https://turso.tech) (libSQL) · [Vercel Blob](https://vercel.com/docs/vercel-blob) · TMDB API · YouTube Data API · Deezer API

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

Open http://localhost:3000, create the first (administrator) account, then go to **Settings → Letterboxd** to import your export (Letterboxd → Settings → Import & Export → Export your data).

Useful scripts:

| Command | What it does |
|---|---|
| `npm run enrich` | Fills in film details from TMDB |
| `npm run reco -- --email you@example.com` | Recomputes a member's recommendations |
| `npm run alertes` | Checks "now showing" alerts for every member |
| `npm run vers-turso` | Copies the local database to Turso (one-off, before going online) |

## Deploy (Vercel + Turso + Vercel Blob)

1. Create a database on **Turso** and copy its URL and a token.
2. Import this repository on **Vercel**, then add the environment variables:
   `DATABASE_URL` (Turso URL), `DATABASE_AUTH_TOKEN`, `TMDB_API_KEY`, `YOUTUBE_API_KEY`, `CRON_SECRET` (any long random string).
3. In Vercel → **Storage**, create a **Blob** store and connect it to the project (this adds `BLOB_READ_WRITE_TOKEN`).
4. Deploy, open the site and create your administrator account. Database tables are created automatically on first launch.

---

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data by JustWatch. Soundtracks via Deezer. Video essays via YouTube. Showtimes: Allociné, Paris Ciné Info. Studio lighting: [Poly Haven](https://polyhaven.com) HDRI (CC0).
