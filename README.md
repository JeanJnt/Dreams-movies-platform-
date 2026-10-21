# Dreams 夢

**Mon journal de cinéma personnel**, une application installable sur ordinateur et sur mobile (PWA), alimentée par mon historique [Letterboxd](https://letterboxd.com) et enrichie avec [TMDB](https://www.themoviedb.org).

*Dreams* doit son nom aux **Rêves** (夢, *Yume*) d'Akira Kurosawa. Le logo est le kanji 夢 tracé au pinceau, généré à partir de la police libre [Yuji Boku](https://fonts.google.com/specimen/Yuji+Boku) (`scripts/make-logo.ts`).

Sept thèmes, chacun inspiré d'un film :

| Thème | Film | Ambiance |
|---|---|---|
| **夢 Yume** | *Rêves* (« Les Corbeaux »), Kurosawa | Ciel de cobalt tourmenté façon Van Gogh, blé jaune de chrome, corbeaux, Fraunces |
| **トトロ** | *Mon voisin Totoro*, Miyazaki | Ciel d'été, nuages, vert du camphrier, noiraudes, Kaisei Decol |
| **Twin Peaks** | *Fire Walk with Me*, Lynch | La Chambre rouge : rideaux de velours, sol à chevrons, Limelight |
| **Pierrot** | *Pierrot le fou*, Godard | Brutaliste : aplats rouge et bleu, typo énorme et charnue |
| **花樣年華** | *In the Mood for Love*, Wong Kar-wai | Rouge sang, lumière ambrée, Bodoni italique |
| **2001** | *2001 : l'Odyssée de l'espace*, Kubrick | Blanc clinique, capitales larges, l'œil rouge de HAL |
| **Close-Up** | *Close-Up*, Kiarostami | Sable et ocre, zigzag de Koker, Lalezar (police d'affiche persane) |

## Fonctionnalités

- **Import Letterboxd** : films vus, notes, coups de cœur, journal, critiques, watchlist et listes
- **Fiches films** : affiche, synopsis, réalisateur, casting, genres (en français)
- **Où regarder** : plateformes légales de streaming, location ou achat en France
- **Critiques longues** : éditeur avec titre, chapô, note, mise en forme (intertitres, citations), sauvegarde automatique, brouillons, et page de lecture façon revue de cinéma
- **Conseils** : recommandations calculées à partir de mes films préférés et de mon profil de goût (genres, réalisateurs), ou tri de ma watchlist, filtrables par plateforme (Netflix, Prime Video, Canal+, HBO Max…), durée, genre et époque
- **Ma collection physique** : format (4K, Blu-ray, DVD…), type de boîtier (classique, steelbook, digipack, coffret), édition et photo de ma vraie jaquette ; **scanner de code-barres** pour ajouter un film en une seconde ; trois vues : boîtiers en relief qui s'ouvrent sur le disque, étagère de tranches, et carrousel de disques en 3D avec de vraies étiquettes (4 maquettes)
- **Affiches au choix** : toutes les affiches TMDB d'un film (FR, EN, JA, sans texte), ou la mienne
- **Stats** : grands chiffres, films par mois, notes, décennies, genres, pays, cinéastes et acteurs, records, et **la frise** de mes années de cinéma
- **Agenda** des prochaines séances (au cinéma ou à la maison), exportable vers le calendrier du téléphone (.ics)
- **Alertes « Au cinéma »** : les films de ma watchlist et mes coups de cœur à l'affiche, bientôt en salle ou ressortis (versions restaurées), avec les séances à Paris
- **Carte de partage** de mes critiques, au format Instagram, aux couleurs du thème
- **Galerie** : mes propres images et vidéos sur chaque film
- **Bande originale** : lien et lecteur Deezer quand la BO existe
- **Cinéastes & acteurs** : mon classement des personnes les plus suivies, et une page par personne (biographie, filmographie, films vus, ma note moyenne)
- **Recherche** de n'importe quel film via TMDB
- **Analyses vidéo** uniquement issues de sources reconnues (Arte, Cahiers du cinéma, Cinémathèque, Criterion, Every Frame a Painting…)
- **Articles** : accès direct aux critiques de DVDClassik, Critikat, Cahiers du cinéma, Télérama, RogerEbert.com, Criterion…
- **Recherche et filtres** par titre, réalisateur, genre et note
- **Listes** avec progression (« 6 / 8 vus »)
- **Installable** sur PC, Android et iPhone, avec une interface adaptée au mobile

### Prochaines étapes

- [ ] Mise en ligne (Vercel + base Turso) pour l'utiliser sur iPhone, Mac et Windows
- [ ] Synchronisation automatique via le flux RSS Letterboxd
- [ ] Alertes vérifiées automatiquement chaque matin

## Stack

[Next.js 15](https://nextjs.org) (App Router, Server Components) · TypeScript · Tailwind CSS 4 · SQLite ([libSQL](https://github.com/tursodatabase/libsql)) · API TMDB

## Installation

```bash
npm install
cp .env.example .env.local   # puis ajouter tes clés TMDB et YouTube
```

1. Exporte tes données sur Letterboxd : *Settings → Import & Export → Export your data*
2. Importe-les, puis récupère les infos des films :

```bash
npm run import -- "chemin/vers/letterboxd-export.zip"
npm run enrich
npm run reco      # recommandations, à relancer de temps en temps
npm run alertes   # films de mes listes au cinéma
npm run dev
```

3. Ouvre [http://localhost:3000](http://localhost:3000)

> Les données personnelles (`/data`) et les clés (`.env.local`) ne sont jamais versionnées.

## Crédits

This product uses the TMDB API but is not endorsed or certified by TMDB. Données de streaming fournies par JustWatch.
