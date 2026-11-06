# Ressources graphiques et 3D de Dreams Movies — sources et licences

| Fichier | Source | Licence | Usage |
|---|---|---|---|
| `brand/logo-blanc.svg`, `brand/icone.svg`, `icon-*.png`, `src/app/icon.svg`, `src/app/apple-icon.png` | Logo de Dreams Movies, fourni par le propriétaire du projet | Propriété du projet | Logo (étoile entre deux croissants), icônes de l'appli |
| `hdri/studio_small_09_1k.hdr` | Poly Haven, « Studio Small 09 » — https://polyhaven.com/a/studio_small_09 | CC0 1.0 | Éclairage studio et reflets des boîtiers et disques |
| `textures/materials/plastic-black/*` | ambientCG, « Plastic 012 A » — https://ambientcg.com/view?id=Plastic012A | CC0 1.0 | Grain de la coque des boîtiers |
| `textures/materials/paper-cover/*` | ambientCG, « Paper 001 » — https://ambientcg.com/view?id=Paper001 | CC0 1.0 | Papier des jaquettes et livrets |

Modélisés pour Dreams Movies, par code (aucun fichier tiers) :
- le boîtier DVD paramétrique (`src/components/three/dreams/caseModel.ts`, à partir de `models/dvdStandard.ts`) : coque, tranche, charnière, moyeu à pétales, fermetures, plateaux pivotants ;
- le disque aux cotes réelles et son matériau de diffraction (`dreams/disc.ts`, `dreams/discMaterial.ts`) ;
- les jaquettes, tranches et étiquettes, imprimées dans des canevas à partir des données du film (`dreams/jacket.ts`, `models/discTemplates.ts`).

Les affiches et images des films viennent de TMDB (servies par `/api/img`) et ne sont jamais stockées dans des fichiers du projet.
