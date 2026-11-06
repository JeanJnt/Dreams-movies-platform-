# Dreams Movies — identité « Argentique »

Source de vérité de la refonte intégrale (novembre 2026). Captures des références : `.refonte-captures/references/` (non versionnées).

## 1. Idée directrice

Une salle noire, des objets éclairés comme en studio. L'argent — la matière du logo, celle du tirage argentique et de la couche réfléchissante d'un disque — est la seule matière de l'interface. La couleur n'entre que par les films : affiches, jaquettes, étiquettes de disques, halo de la page d'un film.

Les DVD (boîtiers, disques, tranches) sont la signature : ils servent à naviguer (platine de l'accueil), à présenter (fiche film), à ranger (bibliothèque), à compter (piles de disques des statistiques).

## 2. Références et ce qu'on en a tiré

| Référence | Observé | Adapté dans Dreams |
|---|---|---|
| A24 (a24.raviklaassens.com) | Les disques sont l'index ; le disque actif tourne au premier plan, les autres reculent ; un clic mène à la fiche (image plein cadre). Générique en filets fins. | La platine de l'accueil (`DiscIndex`) : disques en diagonale dans la profondeur, générique à gauche, lancement du disque puis fiche. Bloc `.credits` partout. |
| Criterion Collection (conventions connues ; site protégé par Cloudflare, non contourné) | Tranches à système commun et numérotées ; couvertures commandées, uniques ; dos éditoriaux. | « La Collection Dreams » : tranche commune (étoile, N°, titre, réalisateur), six maquettes de face selon le film, vrai dos (synopsis, photogramme, générique, caractéristiques, code-barres). |
| AYA | Rangées-pilules porteuses d'information, contraste d'échelle titre / texte. | Journal en rangées (date, film, note), boutons pilules, titres très grands et texte sobre. |
| Aquirin | Chaque objet interactif a son comportement propre. | Disque : inertie, bascule vers le pointeur ; boîtier : tourne au doigt, s'ouvre ; tranche : sort du rang. |
| Shopify Editions | Les éditions rangées comme des objets sur des étagères éclairées. | La bibliothèque 3D en chêne noir, tranches d'épaisseurs réelles. |
| Linear, Vercel (finition) | Hiérarchie par la valeur, surfaces distinguées par le ton. | Quatre niveaux de noir, filets à 7 % et 13 % de blanc, aucune bordure épaisse. |
| Cannes, NEON | Image de film en format large, titres serif. | Plan cinémascope (2,39:1) sous l'en-tête de la fiche, synopsis posé dessus. |
| Vidéos TikTok fournies | Lecteur indisponible aux navigateurs automatisés ; descriptions : démonstrations de sites animés. | — |
| ScreensDesign | MCP et parcours complets réservés au compte Pro. | Chapitrage public du parcours Letterboxd (fiche, listes, journal) consulté. |

## 3. Couleur

| Rôle | Valeur |
|---|---|
| Fond | `#000000` |
| Panneaux | `#0b0b0c` → `#141416` → `#1d1d20` |
| Filets | blanc à 7 %, 13 %, 22 % |
| Texte | `#ecebe7` (blanc cassé), `#b9b7b2`, `#8b8984`, `#5d5b58` |
| Action principale | bouton plein `#ecebe7`, texte noir (une seule par écran) |
| Argent | dégradé du logo (`--silver`) : filet actif de la navigation, chiffres-clés, étoile des tranches |
| Cœur | `#d4574e` (seule teinte de l'interface) |
| Film | `--film` : couleur dominante de l'image du film, en halo très doux |

## 4. Typographie

- **Bodoni Moda** (taille optique) : titres, titres de films, grands chiffres. Les déliés en aiguille répondent aux pointes de l'étoile.
- **Jost** : interface, texte courant (16 px, interligne 1,55), et capitales espacées réservées aux génériques et tranches (référence Futura des éditions de cinéma).
- Pas de monospace, pas de libellés en capitales au-dessus de chaque titre.

## 5. Espace, formes, ombres

Pas de 4 px ; gouttière 20 / 40 / 64 px ; largeur max. 1480 px. Rayons hiérarchisés : affiche 3 px, panneau 20 px, contrôles en pilule. Ombres seulement sous les objets (affiches, boîtiers, menus).

## 6. Navigation et compartiments

Six rubriques : Accueil, Découvrir (ce soir, au cinéma, recherche, personnes), Journal (films vus, critiques, listes, mes 10 films), Watchlist, Collection (bibliothèque, ajouter, scanner), La bande (activité, membres, agenda).
Ordinateur : barre de verre noire, menus de rubrique au survol, filet argent sous la rubrique active (GSAP). Chaque page de rubrique répète ses onglets en tête (`SectionTabs`). Téléphone : barre flottante à 5 onglets (Accueil, Découvrir, Journal, Collection, Moi) ; « Moi » regroupe profil, watchlist, statistiques, la bande, réglages.

## 7. Mouvement (GSAP)

- `PageTransition` : entrée de page (0,42 s, power3.out), titres `[data-split]` composés ligne par ligne (SplitText), sections `[data-reveal]` et grilles `[data-stagger]` au défilement (ScrollTrigger, une fois). N'agit qu'après l'hydratation de React. Contexte détruit à chaque changement de page.
- Menus et filet actif de la navigation : GSAP, 0,18–0,32 s.
- 3D : timelines GSAP sur l'état mécanique (ouverture, sortie du disque, rotation) ; positions de la platine.
- Palette ⌘K : aucune animation (ouverte au clavier). `prefers-reduced-motion` : état final immédiat, plus de rotation automatique.

## 8. 3D

- Boîtier : une seule famille Amaray (135 × 190 mm), épaisseur 7 / 14 / 19 / 22 / 27 mm selon `lib/case-thickness.ts` (durée, série, mentions de l'édition) ; plateaux pivotants pour 2 à 4 disques ; jaquette dont la tranche suit l'épaisseur.
- Disque : cotes réelles, moyeu en polycarbonate transparent et anneau d'empilement, inscriptions moulées et BCA, couche réfléchissante à diffraction (shader : réseau de 740 nm, trois lumières, spectre de Zucconi, rayures circulaires), étiquette sérigraphiée (10 modèles).
- Éclairage : HDR studio (Poly Haven, CC0), ombres de contact.
- Performance : un canevas par écran, boucle arrêtée hors de l'écran, chargement différé, volumes légers sur les étagères (seul le boîtier ouvert est détaillé), repli sur l'affiche sans WebGL.
