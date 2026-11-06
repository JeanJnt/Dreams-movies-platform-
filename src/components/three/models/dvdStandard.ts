import * as THREE from "three";

/*
 * Modèle de référence : boîtier DVD « Amaray » standard, à l'échelle réelle (mètres).
 *   190 × 135,5 × 14,5 mm ; coque en polypropylène injecté, fourreau PVC transparent soudé, jaquette 273 × 183 mm.
 * Chaque pièce est un maillage nommé, avec ses UV :
 *   Coque_Arriere, Coque_Avant (couvercle), Tranche, Charniere, Fermeture_*, Prehension, Moyeu, Rail_Disque,
 *   Agrafe_Livret_*, Livret, Jaquette, Fourreau, Disque_* (étiquette, miroir, moyeu transparent, face de lecture, tranche).
 * Les matériaux nommés DM_* sont ceux que l'application remplace pour chaque film :
 *   DM_Jaquette (gabarit dos | tranche | face, 2730 × 1830 px), DM_Etiquette (disque, carré), DM_Livret.
 * Le couvercle est un nœud « Couvercle » dont le pivot est sur la charnière : rotation.y < 0 pour l'ouvrir.
 */

// Dimensions d'un format de boîtier (mètres) et gabarit de sa jaquette (millimètres : dos | tranche | face)
export type CaseSpec = { W: number; H: number; T: number; plate: number; wall: number; radius: number; spineR: number; paperH: number; jacket: { back: number; spine: number; front: number; h: number } };
export const DVD: CaseSpec = { W: 0.1355, H: 0.19, T: 0.0145, plate: 0.0013, wall: 0.0012, radius: 0.0035, spineR: 0.0032, paperH: 0.183, jacket: { back: 129.5, spine: 14, front: 129.5, h: 183 } };
// Blu-ray : plus court, plus fin, coins plus arrondis
export const BLURAY: CaseSpec = { W: 0.1285, H: 0.148, T: 0.0122, plate: 0.0012, wall: 0.0011, radius: 0.0062, spineR: 0.0028, paperH: 0.1445, jacket: { back: 127, spine: 12, front: 127, h: 144.5 } };
// 4K Ultra HD (boîtier noir) : gabarit Blu-ray, un peu plus épais
export const UHD: CaseSpec = { ...BLURAY, T: 0.0138, jacket: { back: 127, spine: 13.5, front: 127, h: 144.5 } };
// Gabarit de la jaquette en pixels (10 px/mm), à donner au générateur d'impression
export const jacketLayout = (k: CaseSpec) => ({ fw: k.jacket.back * 10, sw: k.jacket.spine * 10, h: k.jacket.h * 10 });

// le format en cours de construction (les fonctions ci-dessous le lisent)
let K: CaseSpec = DVD;

export type DvdMaterials = Record<
  "shell" | "shellInner" | "hub" | "sleeve" | "jacket" | "booklet" | "label" | "discMirror" | "discData" | "discClear" | "discEdge",
  THREE.Material
> & { bookletEdge?: THREE.Material };

/* ---------- utilitaires géométriques ---------- */
function roundedRect(w: number, h: number, r: number, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}
function pathOf(shape: THREE.Shape) {
  const p = new THREE.Path();
  p.curves = shape.curves;
  p.currentPoint = shape.currentPoint;
  return p;
}
// Les UV d'une extrusion sont en mètres : on les ramène à une échelle de texture (1 répétition = `tile` m)
function scaleUV(g: THREE.BufferGeometry, tile = 0.05) {
  const uv = g.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
  uv.needsUpdate = true;
  return g;
}
function mesh(name: string, g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[]) {
  const o = new THREE.Mesh(g, m);
  o.name = name;
  o.castShadow = true;
  o.receiveShadow = true;
  return o;
}

/* ---------- une demi-coque : fond + parois à lèvre arrondie ---------- */
function halfShell(name: string, m: DvdMaterials, depth: number) {
  const { W, H, plate, wall, radius } = K;
  const g = new THREE.Group();
  g.name = name;
  const b = 0.00035; // chanfrein arrondi des arêtes
  const floor = new THREE.ExtrudeGeometry(roundedRect(W - b * 2, H - b * 2, radius - b), { depth: plate - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10 });
  floor.translate(0, 0, b);
  g.add(mesh(name + "_Fond", scaleUV(floor), [m.shellInner, m.shell]));
  // parois : un anneau (contour extérieur, contour intérieur) extrudé, lèvre supérieure arrondie
  const ring = roundedRect(W - 0.0003, H - 0.0003, radius - 0.00015);
  ring.holes.push(pathOf(roundedRect(W - wall * 2, H - wall * 2, Math.max(0.0008, radius - wall))));
  const lip = 0.00028;
  const walls = new THREE.ExtrudeGeometry(ring, { depth: depth - plate - lip, bevelEnabled: true, bevelThickness: lip, bevelSize: 0.0001, bevelSegments: 3, curveSegments: 10 });
  walls.translate(0, 0, plate);
  g.add(mesh(name + "_Parois", scaleUV(walls), [m.shell, m.shell]));
  return g;
}

/* ---------- la tranche : un U arrondi qui relie les deux coques ---------- */
function spine(m: DvdMaterials) {
  const { W, H, T, spineR } = K;
  const th = 0.0012;
  const x0 = -W / 2;
  const s = new THREE.Shape();
  // profil (x, z) du U, de l'arrière vers l'avant, puis retour à l'intérieur
  s.moveTo(x0 + spineR + 0.004, -T / 2);
  s.lineTo(x0 + spineR, -T / 2);
  s.absarc(x0 + spineR, -T / 2 + spineR, spineR, -Math.PI / 2, -Math.PI, true);
  s.lineTo(x0, T / 2 - spineR);
  s.absarc(x0 + spineR, T / 2 - spineR, spineR, Math.PI, Math.PI / 2, true);
  s.lineTo(x0 + spineR + 0.004, T / 2);
  s.lineTo(x0 + spineR + 0.004, T / 2 - th);
  s.lineTo(x0 + spineR, T / 2 - th);
  s.absarc(x0 + spineR, T / 2 - spineR, spineR - th, Math.PI / 2, Math.PI, false);
  s.lineTo(x0 + th, -T / 2 + spineR);
  s.absarc(x0 + spineR, -T / 2 + spineR, spineR - th, -Math.PI, -Math.PI / 2, false);
  s.lineTo(x0 + spineR + 0.004, -T / 2 + th);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: H - 0.0006, bevelEnabled: false, curveSegments: 14 });
  g.rotateX(Math.PI / 2);
  g.translate(0, (H - 0.0006) / 2, 0);
  return mesh("Tranche", scaleUV(g), [m.shell, m.shell]);
}

/* ---------- moyeu : plateau tourné, 12 pétales, bouton central ---------- */
function hub(m: DvdMaterials, z: number, petals = 12) {
  const g = new THREE.Group();
  g.name = "Moyeu";
  const lathe = (pts: [number, number][], seg = 64) => {
    const geo = new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg);
    geo.rotateX(Math.PI / 2); // l'axe du tour devient z
    return geo;
  };
  // plateau : marche, gorge, rebord
  g.add(mesh("Moyeu_Plateau", lathe([[0.0105, 0], [0.0182, 0], [0.0186, 0.0004], [0.0186, 0.0011], [0.018, 0.0015], [0.0128, 0.0015], [0.0124, 0.0019], [0.0112, 0.0019], [0.0108, 0.0015], [0.0105, 0.0015]]), m.hub));
  // pétales : lames souples en couronne, légèrement inclinées vers l'extérieur
  const petal = new THREE.Shape();
  petal.moveTo(-0.0012, 0);
  petal.lineTo(0.0012, 0);
  petal.lineTo(0.0009, 0.0034);
  petal.absarc(0, 0.0034, 0.0009, 0, Math.PI, false);
  petal.closePath();
  const pg = new THREE.ExtrudeGeometry(petal, { depth: 0.0007, bevelEnabled: true, bevelThickness: 0.00012, bevelSize: 0.00012, bevelSegments: 2, curveSegments: 6 });
  pg.translate(0, 0, -0.00035);
  pg.rotateX(Math.PI / 2); // la lame se dresse selon z
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const p = mesh(`Moyeu_Petale_${i + 1}`, pg, m.hub);
    p.position.set(Math.cos(a) * 0.0074, Math.sin(a) * 0.0074, 0.0015);
    p.rotation.z = a - Math.PI / 2;
    p.rotateX(-0.14);
    // ergot au bout de la lame, qui retient le disque
    const nub = mesh(`Moyeu_Ergot_${i + 1}`, new THREE.SphereGeometry(0.00062, 12, 8), m.hub);
    nub.position.set(0, 0.00055, 0.0042);
    p.add(nub);
    g.add(p);
  }
  // bouton central bombé
  g.add(mesh("Moyeu_Bouton", lathe([[0, 0.0052], [0.0018, 0.0051], [0.0034, 0.0046], [0.0044, 0.0038], [0.0048, 0.0028], [0.0049, 0.0015], [0.0, 0.0015]]), m.hub));
  g.position.z = z;
  return g;
}

/* ---------- le disque : étiquette, miroir, moyeu transparent, face de lecture, tranche ---------- */
export function buildDisc(m: DvdMaterials) {
  const g = new THREE.Group();
  g.name = "Disque";
  const R = 0.06, hole = 0.0075, th = 0.0012;
  const ring = (name: string, r0: number, r1: number, mat: THREE.Material, z: number, flip = false) => {
    const geo = new THREE.RingGeometry(r0, r1, 128, 2);
    if (flip) geo.rotateY(Math.PI);
    const o = mesh(name, geo, mat);
    o.position.z = z;
    return o;
  };
  // face imprimée (l'étiquette couvre tout le disque ; sa transparence laisse voir le miroir et le moyeu)
  const label = new THREE.CircleGeometry(R - 0.0002, 128);
  const lab = mesh("Disque_Etiquette", label, m.label);
  lab.position.z = th / 2 + 0.00002;
  g.add(lab);
  g.add(ring("Disque_Miroir", 0.0168, R - 0.0002, m.discMirror, th / 2 - 0.00001));
  g.add(ring("Disque_MoyeuTransparent", hole, 0.0168, m.discClear, th / 2 - 0.00001));
  g.add(ring("Disque_FaceLecture", 0.0168, R, m.discData, -th / 2, true));
  g.add(ring("Disque_MoyeuDessous", hole, 0.0168, m.discClear, -th / 2, true));
  // anneau d'empilement (stacking ring) sous le disque
  const stack = mesh("Disque_AnneauEmpilement", new THREE.TorusGeometry(0.0163, 0.00022, 8, 96), m.discClear);
  stack.position.z = -th / 2 - 0.0001;
  g.add(stack);
  const edge = new THREE.CylinderGeometry(R, R, th, 128, 1, true);
  edge.rotateX(Math.PI / 2);
  g.add(mesh("Disque_Tranche", edge, m.discEdge));
  const inner = new THREE.CylinderGeometry(hole, hole, th, 48, 1, true);
  inner.rotateX(Math.PI / 2);
  g.add(mesh("Disque_Trou", inner, m.discClear));
  return g;
}

/* ---------- jaquette et fourreau : une bande qui s'enroule dos → tranche → face ---------- */
function wrapStrip(name: string, offset: number, height: number, openInset: number, mat: THREE.Material, split: "back" | "front") {
  const { W, T, spineR, jacket } = K;
  const total = jacket.back + jacket.spine + jacket.front;
  const hd = T / 2 + offset, xl = -W / 2 - offset, rr = spineR + offset, cx = xl + rr;
  const xR = W / 2 - openInset;
  const P: { x: number; z: number; u: number }[] = [];
  const seg = (pts: [number, number][], u0: number, u1: number) => {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    pts.forEach(([x, z], i) => P.push({ x, z, u: u0 + (u1 - u0) * (L[i] / L[L.length - 1]) }));
  };
  const arc = (a0: number, a1: number, czz: number, n = 12): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(a0 + ((a1 - a0) * i) / n) * rr, czz + Math.sin(a0 + ((a1 - a0) * i) / n) * rr]);
  const ub = jacket.back / total, us = jacket.spine / total;
  if (split === "back") {
    seg([[xR, -hd], [cx, -hd]], 0, ub);
    seg([...arc(-Math.PI / 2, -Math.PI, -hd + rr), ...arc(Math.PI, Math.PI / 2, hd - rr)], ub, ub + us);
  } else seg([[cx, hd], [xR, hd]], ub + us, 1);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const rows = 6; // quelques rangées : le papier peut être très légèrement bombé
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    const tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
    for (let r = 0; r <= rows; r++) {
      const v = r / rows;
      pos.push(p.x, -height / 2 + v * height, p.z);
      nor.push(-tz / l, 0, tx / l);
      uv.push(p.u, v);
    }
  });
  for (let i = 0; i < P.length - 1; i++)
    for (let r = 0; r < rows; r++) {
      const a = i * (rows + 1) + r, b2 = a + 1, c = a + rows + 1, d = c + 1;
      idx.push(a, c, b2, b2, c, d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const o = mesh(name, g, mat);
  o.castShadow = name.startsWith("Jaquette");
  return o;
}

/* ---------- assemblage ---------- */
export type AmarayOptions = { name: string; grip?: boolean; petals?: number; booklet?: boolean; bookletPages?: number };
export function buildDvdStandard(m: DvdMaterials) {
  return buildAmaray(m, DVD, { name: "DVD_Standard", grip: true, petals: 12, booklet: true });
}
export function buildAmaray(m: DvdMaterials, spec: CaseSpec, o: AmarayOptions) {
  K = spec;
  const { W, H, T, plate } = K;
  const root = new THREE.Group();
  root.name = o.name;
  const half = T / 2 - 0.0002;

  // ---- arrière (fixe) : coque, tranche, moyeu, rail, disque, fermeture
  const back = halfShell("Coque_Arriere", m, half);
  back.position.z = -T / 2;
  root.add(back);
  root.add(spine(m));
  const zIn = -T / 2 + plate;
  const hubG = hub(m, zIn, o.petals ?? 12);
  hubG.position.x = 0.0015;
  root.add(hubG);
  const rail = mesh("Rail_Disque", new THREE.TorusGeometry(0.0606, 0.0005, 8, 160), m.shellInner);
  rail.position.set(0.0015, 0, zIn + 0.0002);
  root.add(rail);
  const disc = buildDisc(m);
  disc.position.set(0.0015, 0, zIn + 0.0015 + 0.0006 + 0.0006);
  root.add(disc);
  // fermeture : deux ergots sur la paroi arrière, côté ouverture
  [-1, 1].forEach((sg, i) => {
    const e = mesh(`Fermeture_Ergot_${i + 1}`, new THREE.CapsuleGeometry(0.0007, 0.004, 4, 10), m.shell);
    e.position.set(W / 2 - K.wall - 0.0004, sg * 0.032, -0.0012);
    root.add(e);
  });
  // stries de préhension sur le chant d'ouverture
  const grip = new THREE.Group();
  grip.name = "Prehension";
  for (let i = 0; i < (o.grip ? 11 : 0); i++) {
    const r = mesh(`Prehension_Strie_${i + 1}`, new THREE.BoxGeometry(0.00035, 0.0011, T * 0.62), m.shell);
    r.position.set(W / 2 + 0.00005, (i - 5) * 0.0024, 0);
    grip.add(r);
  }
  root.add(grip);
  // charnière : le jonc qui relie la tranche au couvercle
  const hinge = new THREE.CylinderGeometry(0.0007, 0.0007, H - 0.004, 16);
  const hingeM = mesh("Charniere", hinge, m.shell);
  hingeM.position.set(-W / 2 + K.spineR, 0, T / 2 - 0.0009);
  root.add(hingeM);

  // ---- jaquette (dos + tranche) et fourreau, solidaires de l'arrière
  root.add(wrapStrip("Jaquette_DosTranche", 0.00022, K.paperH, 0.0035, m.jacket, "back"));
  root.add(wrapStrip("Fourreau_DosTranche", 0.00055, H - 0.0007, 0.0006, m.sleeve, "back"));

  // ---- couvercle : pivote sur la charnière
  const lid = new THREE.Group();
  lid.name = "Couvercle";
  lid.position.set(-W / 2 + K.spineR, 0, T / 2 - 0.0009);
  const inner = new THREE.Group();
  inner.position.set(-lid.position.x, 0, -lid.position.z);
  lid.add(inner);
  const front = halfShell("Coque_Avant", m, half);
  front.rotation.y = Math.PI;
  front.position.z = T / 2;
  inner.add(front);
  // agrafes du livret (deux crochets moulés, côté tranche)
  [-1, 1].forEach((sg, i) => {
    const clip = new THREE.Shape();
    clip.moveTo(0, 0);
    clip.lineTo(0.009, 0);
    clip.lineTo(0.009, 0.0016);
    clip.lineTo(0.0025, 0.0016);
    clip.lineTo(0.0025, 0.0028);
    clip.lineTo(0, 0.0028);
    clip.closePath();
    const cg = new THREE.ExtrudeGeometry(clip, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.0002, bevelSize: 0.0002, bevelSegments: 2 });
    cg.translate(0, 0, -0.003);
    const c = mesh(`Agrafe_Livret_${i + 1}`, cg, m.shell);
    c.rotation.set(0, -Math.PI / 2, sg > 0 ? Math.PI : 0);
    c.position.set(-W / 2 + 0.0075, sg * (H / 2 - 0.008), T / 2 - plate);
    if (o.booklet !== false) inner.add(c);
  });
  // livret glissé sous les agrafes
  // livret : une simple feuille, ou un vrai cahier de pages (édition de prestige)
  const pages = o.bookletPages ?? 0;
  const bw = W - 0.0145, bh = H - 0.012;
  if (o.booklet !== false) {
    if (pages > 0) {
      const thick = pages * 0.0001;
      const block = new THREE.BoxGeometry(bw, bh, thick);
      const edge = m.bookletEdge ?? m.booklet;
      const book = mesh("Livret", block, [edge, edge, edge, edge, m.booklet, m.booklet]);
      book.rotation.y = Math.PI;
      book.position.set(0.004, 0, T / 2 - plate - thick / 2 - 0.0001);
      inner.add(book);
    } else {
      const bk = new THREE.PlaneGeometry(bw, bh);
      bk.rotateY(Math.PI);
      const booklet = mesh("Livret", bk, m.booklet);
      booklet.position.set(0.004, 0, T / 2 - plate - 0.0003);
      inner.add(booklet);
    }
  }
  // fermeture côté couvercle : deux crochets qui viennent sur les ergots
  [-1, 1].forEach((sg, i) => {
    const h = mesh(`Fermeture_Crochet_${i + 1}`, new THREE.BoxGeometry(0.0011, 0.0062, 0.0016), m.shell);
    h.position.set(W / 2 - K.wall - 0.0005, sg * 0.032, 0.0011);
    inner.add(h);
  });
  inner.add(wrapStrip("Jaquette_Face", 0.00022, K.paperH, 0.0035, m.jacket, "front"));
  inner.add(wrapStrip("Fourreau_Face", 0.00055, H - 0.0007, 0.0006, m.sleeve, "front"));
  root.add(lid);
  return root;
}

/* ---------- matériaux par défaut (ceux exportés dans le GLB) ---------- */
export function defaultMaterials(t: {
  plasticNormal: THREE.Texture;
  plasticRough: THREE.Texture;
  paperNormal: THREE.Texture;
  paperRough: THREE.Texture;
  sleeveNormal: THREE.Texture;
  jacket: THREE.Texture;
  label: THREE.Texture;
  booklet: THREE.Texture;
}): DvdMaterials {
  const named = <M extends THREE.Material>(name: string, mm: M) => ((mm.name = name), mm);
  return {
    shell: named("DM_Coque", new THREE.MeshPhysicalMaterial({ color: "#0f0f11", roughness: 0.42, normalMap: t.plasticNormal, normalScale: new THREE.Vector2(0.12, 0.12), clearcoat: 0.25, clearcoatRoughness: 0.35 })),
    shellInner: named("DM_CoqueInterieur", new THREE.MeshPhysicalMaterial({ color: "#121214", roughness: 1, roughnessMap: t.plasticRough, normalMap: t.plasticNormal, normalScale: new THREE.Vector2(0.6, 0.6) })),
    hub: named("DM_Moyeu", new THREE.MeshPhysicalMaterial({ color: "#141416", roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 })),
    sleeve: named(
      "DM_Fourreau",
      new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.06, metalness: 0, transmission: 1, thickness: 0.0002, ior: 1.52, clearcoat: 1, clearcoatRoughness: 0.03, normalMap: t.sleeveNormal, normalScale: new THREE.Vector2(0.08, 0.08), specularIntensity: 1 }),
    ),
    jacket: named("DM_Jaquette", new THREE.MeshPhysicalMaterial({ map: t.jacket, roughness: 0.62, roughnessMap: t.paperRough, normalMap: t.paperNormal, normalScale: new THREE.Vector2(0.18, 0.18), sheen: 0.15, sheenRoughness: 0.8, side: THREE.DoubleSide })),
    booklet: named("DM_Livret", new THREE.MeshPhysicalMaterial({ map: t.booklet, roughness: 0.7, normalMap: t.paperNormal, normalScale: new THREE.Vector2(0.15, 0.15) })),
    label: named("DM_Etiquette", new THREE.MeshPhysicalMaterial({ map: t.label, transparent: true, alphaTest: 0.02, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.25 })),
    discMirror: named("DM_DisqueMiroir", new THREE.MeshPhysicalMaterial({ color: "#dfe2e6", metalness: 1, roughness: 0.08, iridescence: 0.6, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 700] })),
    discData: named("DM_DisqueLecture", new THREE.MeshPhysicalMaterial({ color: "#d6d8dd", metalness: 1, roughness: 0.06, iridescence: 1, iridescenceIOR: 1.8, iridescenceThicknessRange: [180, 820] })),
    discClear: named("DM_DisqueTransparent", new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transmission: 1, thickness: 0.0012, ior: 1.58, specularIntensity: 1 })),
    discEdge: named("DM_DisqueTranche", new THREE.MeshPhysicalMaterial({ color: "#c9ccd2", metalness: 0.6, roughness: 0.2, transmission: 0.4, thickness: 0.001 })),
  };
}
