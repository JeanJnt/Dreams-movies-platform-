import * as THREE from "three";

/*
 * Textures des matériaux (PBR) : plastique noir et papier (ambientCG, CC0), et la carte de normales du film PVC,
 * générée : de très larges ondulations, comme un fourreau soudé qui n'est jamais parfaitement tendu.
 */
const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture>>();
function tex(url: string, srgb = false, repeat = 1) {
  const key = url + repeat;
  if (!cache.has(key))
    cache.set(
      key,
      loader.loadAsync(url).then((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat, repeat);
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = 8;
        t.userData.mimeType = "image/jpeg";
        return t;
      }),
    );
  return cache.get(key)!;
}

export async function materialTextures() {
  const [plasticNormal, plasticRough, paperNormal, paperRough] = await Promise.all([
    tex("/textures/materials/plastic-black/normal.jpg"),
    tex("/textures/materials/plastic-black/roughness.jpg"),
    tex("/textures/materials/paper-cover/normal.jpg"),
    tex("/textures/materials/paper-cover/roughness.jpg"),
  ]);
  return { plasticNormal, plasticRough, paperNormal, paperRough, sleeveNormal: sleeveNormal() };
}

// Bruit doux → carte de hauteur → carte de normales (Sobel)
let sleeveTex: THREE.Texture | null = null;
export function sleeveNormal() {
  if (sleeveTex) return sleeveTex;
  const N = 512;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, N, N);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * N, y = rnd() * N, r = 30 + rnd() * 120, v = rnd() > 0.5 ? 255 : 0;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${v},${v},${v},0.08)`);
    gr.addColorStop(1, "rgba(128,128,128,0)");
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const h = g.getImageData(0, 0, N, N).data;
  const out = g.createImageData(N, N);
  const H = (x: number, y: number) => h[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 6, dy = (H(x, y + 1) - H(x, y - 1)) * 6;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * N + x) * 4;
      out.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  g.putImageData(out, 0, 0);
  sleeveTex = new THREE.CanvasTexture(c);
  sleeveTex.wrapS = sleeveTex.wrapT = THREE.RepeatWrapping;
  sleeveTex.userData.mimeType = "image/jpeg";
  return sleeveTex;
}

// Gabarit de la jaquette DVD en pixels (10 px/mm) : dos | tranche | face
export const DVD_JACKET_LAYOUT = { fw: 1295, sw: 140, h: 1830 };
