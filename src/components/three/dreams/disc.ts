import * as THREE from "three";
import { bindDiffraction, diffractionMaterial } from "./discMaterial";

/*
 * Un DVD aux cotes réelles (unités : mètres) :
 *   Ø 120 mm, 1,2 mm d'épaisseur (deux galettes de 0,6 mm collées), trou central Ø 15 mm ;
 *   zone de serrage transparente jusqu'à Ø 33 mm, anneau d'empilement en relief sous le disque (Ø 33,6 mm) ;
 *   inscriptions moulées dans le polycarbonate (numéro de matrice, code IFPI) autour du moyeu ;
 *   bande miroir à partir de Ø 44 mm, zone de données jusqu'à Ø 117 mm, bord transparent ;
 *   étiquette sérigraphiée côté face, de Ø 43 à Ø 116 mm.
 * La couche réfléchissante est au milieu de l'épaisseur : vue de dessous à travers le polycarbonate (vernis),
 * vue de dessus là où l'étiquette laisse le métal à nu.
 */
export const DISC = { R: 0.06, hole: 0.0075, th: 0.0012, clear: 0.0165, stack: 0.0168, mirror: 0.022, label: 0.0215, dataOut: 0.0586, print: 0.058 };

// UV planes sur tout le disque : (0,0) → (1,1) sur un carré de 120 mm, comme la texture de l'étiquette
function discUV(g: THREE.BufferGeometry, flip = false) {
  const p = g.getAttribute("position"), uv = g.getAttribute("uv");
  for (let i = 0; i < p.count; i++) uv.setXY(i, (flip ? -p.getX(i) : p.getX(i)) / (DISC.R * 2) + 0.5, p.getY(i) / (DISC.R * 2) + 0.5);
  uv.needsUpdate = true;
  return g;
}
const ring = (r0: number, r1: number, seg = 160) => discUV(new THREE.RingGeometry(r0, r1, seg, 3));

let molded: THREE.Texture | null = null;
// Les inscriptions moulées autour du moyeu : texte en relief, à peine visible, lisible sous la lumière rasante
function moldedTexture() {
  if (molded) return molded;
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const C = S / 2, mm = S / 120;
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, S, S);
  const arc = (text: string, r: number, start: number, size: number, alpha: number) => {
    ctx.save();
    ctx.font = `500 ${size}px Arial, sans-serif`;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let a = start;
    for (const ch of text) {
      const w = ctx.measureText(ch).width + size * 0.12;
      a += w / 2 / r;
      ctx.save();
      ctx.translate(C + Math.cos(a) * r, C + Math.sin(a) * r);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      a += w / 2 / r;
    }
    ctx.restore();
  };
  arc("DREAMS MOVIES  ·  DVD-9  ·  M1 S2  ·  IFPI L558  ·  0421-7", 13.6 * mm, -Math.PI * 0.95, 13, 0.75);
  arc("IFPI 07K3  ·  MADE IN FRANCE", 11.4 * mm, Math.PI * 0.2, 11, 0.55);
  // zone de marquage BCA : de fines barres radiales, comme un code-barres en couronne
  ctx.save();
  ctx.translate(C, C);
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let a = -0.6; a < 0.6; a += 0.006) {
    if (rnd() < 0.45) continue;
    ctx.rotate(0.006);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillRect(22.4 * mm, -0.7, 1.1 * mm, 1.4 + rnd() * 1.6);
  }
  ctx.restore();
  molded = new THREE.CanvasTexture(c);
  molded.anisotropy = 8;
  return molded;
}

export type DiscParts = { group: THREE.Group; label: THREE.MeshPhysicalMaterial; dispose: () => void };

/*
 * Construit un disque. `label` : la texture de l'étiquette (2048 px pour 120 mm, transparente hors impression).
 * Le groupe est centré, face imprimée vers +z.
 */
export function buildRealDisc(label: THREE.Texture | null = null): DiscParts {
  const { R, hole, th } = DISC;
  const group = new THREE.Group();
  group.name = "Disque";
  const mats: THREE.Material[] = [];
  const add = <M extends THREE.Material>(m: M) => (mats.push(m), m);
  const geos: THREE.BufferGeometry[] = [];
  const mesh = (name: string, g: THREE.BufferGeometry, m: THREE.Material, z = 0) => {
    geos.push(g);
    const o = new THREE.Mesh(g, m);
    o.name = name;
    o.position.z = z;
    o.castShadow = true;
    o.receiveShadow = true;
    group.add(o);
    return o;
  };

  // Polycarbonate transparent du moyeu (vu à travers : légère réfraction, reflets nets)
  const clear = add(new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.06, transmission: 1, thickness: 0.0012, ior: 1.585, specularIntensity: 0.55, envMapIntensity: 0.6, clearcoat: 0.5, clearcoatRoughness: 0.03, attenuationColor: new THREE.Color("#dfe8ee"), attenuationDistance: 0.02 }));
  // Profil tourné du moyeu : face plate, anneau d'empilement en relief dessous, trou aux arêtes adoucies
  const prof: [number, number][] = [
    [hole, -th / 2 + 0.0001],
    [hole + 0.0001, -th / 2],
    [0.0163, -th / 2],
    [0.01645, -th / 2 - 0.00018],
    [0.0172, -th / 2 - 0.00018],
    [0.01735, -th / 2],
    [DISC.mirror + 0.0006, -th / 2],
    [DISC.mirror + 0.0006, th / 2],
    [hole + 0.0001, th / 2],
    [hole, th / 2 - 0.0001],
    [hole, -th / 2 + 0.0001],
  ];
  const hub = new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), 128);
  hub.rotateX(Math.PI / 2);
  mesh("Disque_Moyeu", hub, clear);

  // Inscriptions moulées et code BCA : sur le dessous du moyeu, en relief laiteux
  const moldMat = add(new THREE.MeshPhysicalMaterial({ color: "#ffffff", alphaMap: moldedTexture(), transparent: true, opacity: 0.32, roughness: 0.55, depthWrite: false }));
  const mold = ring(0.0095, 0.0235);
  mold.rotateY(Math.PI);
  mesh("Disque_Inscriptions", discUV(mold, true), moldMat, -th / 2 - 0.00002);

  // La couche réfléchissante (aluminium gravé de pistes) : diffraction
  const metal = add(diffractionMaterial({ rIn: DISC.mirror, rOut: DISC.dataOut }));
  const layer = mesh("Disque_Couche", ring(DISC.mirror, DISC.dataOut + 0.0004, 256), metal, 0);
  bindDiffraction(layer, metal);

  // Le polycarbonate au-dessus et au-dessous de la couche (bord extérieur visible en transparence)
  const rimMat = add(new THREE.MeshPhysicalMaterial({ color: "#e8edf0", roughness: 0.05, transparent: true, opacity: 0.25, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false }));
  mesh("Disque_BordDessus", ring(DISC.dataOut + 0.0004, R - 0.00015), rimMat, th / 2);
  const under = ring(DISC.dataOut + 0.0004, R - 0.00015);
  under.rotateY(Math.PI);
  mesh("Disque_BordDessous", under, rimMat, -th / 2);
  // tranche : polycarbonate poli, un peu laiteux, arête adoucie
  const edgeMat = add(new THREE.MeshPhysicalMaterial({ color: "#c9cfd4", roughness: 0.18, metalness: 0.3, transmission: 0.5, thickness: 0.001, clearcoat: 1 }));
  const edge = new THREE.LatheGeometry(
    [
      [R - 0.00015, -th / 2],
      [R - 0.00002, -th / 2 + 0.00012],
      [R, 0],
      [R - 0.00002, th / 2 - 0.00012],
      [R - 0.00015, th / 2],
    ].map(([r, z]) => new THREE.Vector2(r, z)),
    256,
  );
  edge.rotateX(Math.PI / 2);
  mesh("Disque_Tranche", edge, edgeMat);
  // trou central : paroi propre
  const holeG = new THREE.CylinderGeometry(hole, hole, th - 0.0002, 96, 1, true);
  holeG.rotateX(Math.PI / 2);
  mesh("Disque_Trou", holeG, clear);

  // L'étiquette sérigraphiée (face) : encre mate, vernis léger ; la transparence laisse le métal à nu
  const labelMat = add(
    new THREE.MeshPhysicalMaterial({ map: label, transparent: true, alphaTest: 0.03, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.2, sheenRoughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  labelMat.name = "DM_Etiquette";
  mesh("Disque_Etiquette", ring(DISC.label, DISC.print, 256), labelMat, th / 2 + 0.00003);
  // dessous de l'étiquette, au même endroit : la laque noire qui protège la couche (vue par la tranche)
  const dispose = () => {
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  };
  return { group, label: labelMat, dispose };
}
