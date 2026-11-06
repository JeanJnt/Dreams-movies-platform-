import * as THREE from "three";
import { buildAmaray, DVD, defaultMaterials, type CaseSpec, type DvdMaterials } from "../models/dvdStandard";
import { materialTextures } from "../models/materials";
import { buildRealDisc, type DiscParts } from "./disc";

/*
 * Le boîtier DVD de Dreams : une seule famille (Amaray noir, coque mate texturée, fourreau PVC brillant),
 * à épaisseur variable. La largeur et la hauteur ne changent jamais (135 × 190 mm) ; seules l'épaisseur,
 * la tranche de la jaquette et l'aménagement intérieur suivent le nombre de disques :
 *   1 disque : moyeu à 12 pétales sur la coque arrière ;
 *   2 à 4 disques : plateaux pivotants (« flippers ») fixés près de la charnière, un disque de chaque côté.
 */
export function caseSpec(mm: number): CaseSpec {
  const T = mm / 1000;
  return { ...DVD, T, spineR: Math.min(0.0032, T / 2 - 0.0006), jacket: { back: 129.5, spine: mm - 0.5, front: 129.5, h: 183 } };
}

let shared: Promise<{ base: DvdMaterials; blank: THREE.Texture }> | null = null;
// Les matériaux communs à tous les boîtiers (plastique, fourreau, moyeu) : chargés une fois
export function caseMaterials() {
  shared ??= materialTextures().then((t) => {
    const blank = new THREE.DataTexture(new Uint8Array([24, 24, 26, 255]), 1, 1);
    blank.needsUpdate = true;
    const base = defaultMaterials({ ...t, jacket: blank, label: blank, booklet: blank });
    // le fourreau PVC : un peu plus présent dans les reflets (on doit sentir le film plastique)
    (base.sleeve as THREE.MeshPhysicalMaterial).clearcoatRoughness = 0.02;
    (base.sleeve as THREE.MeshPhysicalMaterial).roughness = 0.04;
    return { base, blank };
  });
  return shared;
}

export type DreamsCase = {
  root: THREE.Group;
  lid: THREE.Object3D | null;
  discs: DiscParts[]; // discs[0] : le disque principal (celui qu'on sort)
  discSlot: THREE.Vector3; // position du disque principal dans le boîtier
  jacket: THREE.MeshPhysicalMaterial;
  booklet: THREE.MeshPhysicalMaterial;
  spec: CaseSpec;
  dispose: () => void;
};

export function buildDreamsCase(mm: number, discCount: number, base: DvdMaterials): DreamsCase {
  const spec = caseSpec(mm);
  // matériaux propres à ce boîtier : la jaquette et le livret (imprimés pour le film)
  const jacket = (base.jacket as THREE.MeshPhysicalMaterial).clone();
  const booklet = (base.booklet as THREE.MeshPhysicalMaterial).clone();
  jacket.onBeforeCompile = (s) => {
    // le revers de la jaquette : papier blanc cassé (vu à travers une coque ouverte)
    s.fragmentShader = s.fragmentShader.replace("#include <map_fragment>", "#include <map_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.86, 0.84, 0.8);");
  };
  const m: DvdMaterials = { ...base, jacket, booklet };
  const root = buildAmaray(m, spec, { name: "Boitier_Dreams", grip: true, petals: 12, booklet: discCount === 1 });
  // on remplace le disque générique par le vrai disque
  const old = root.getObjectByName("Disque");
  const slot = old ? old.position.clone() : new THREE.Vector3();
  if (old) root.remove(old);
  const discs: DiscParts[] = [];
  const main = buildRealDisc(null);
  main.group.position.copy(slot);
  root.add(main.group);
  discs.push(main);

  // plateaux pivotants pour les éditions à plusieurs disques
  const { W, H, T, plate } = spec;
  const inner = T - plate * 2 - 0.0004;
  const flippers = Math.ceil((discCount - 1) / 2);
  for (let f = 0; f < flippers; f++) {
    const z = -T / 2 + plate + (inner * (f + 1)) / (flippers + 1);
    const tray = new THREE.Group();
    tray.name = `Plateau_${f + 1}`;
    const shape = new THREE.Shape();
    const w = W - 0.016, h = H - 0.02, r = 0.004;
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w / 2, h / 2 - r);
    shape.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
    const plateG = new THREE.ExtrudeGeometry(shape, { depth: 0.0011, bevelEnabled: true, bevelThickness: 0.0002, bevelSize: 0.0002, bevelSegments: 2, curveSegments: 8 });
    plateG.translate(0.004, 0, -0.00055);
    const p = new THREE.Mesh(plateG, base.shellInner);
    p.castShadow = p.receiveShadow = true;
    tray.add(p);
    // une rondelle de serrage de chaque côté
    [1, -1].forEach((side) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0011, 10, 48), base.hub);
      ring.position.set(0.0055, 0, side * 0.0011);
      tray.add(ring);
    });
    tray.position.z = z;
    root.add(tray);
    // un disque de chaque côté du plateau (tant qu'il en reste)
    for (const side of [1, -1]) {
      if (discs.length >= discCount) break;
      const d = buildRealDisc(null);
      d.group.position.set(0.0055, 0, z + side * 0.0024);
      if (side < 0) d.group.rotation.y = Math.PI;
      root.add(d.group);
      discs.push(d);
    }
  }
  const lid = root.getObjectByName("Couvercle") ?? null;
  return {
    root,
    lid,
    discs,
    discSlot: slot,
    jacket,
    booklet,
    spec,
    dispose: () => {
      discs.forEach((d) => d.dispose());
      jacket.dispose();
      booklet.dispose();
      root.traverse((o) => (o as THREE.Mesh).geometry?.dispose?.());
    },
  };
}
