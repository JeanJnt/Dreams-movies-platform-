import * as THREE from "three";

/*
 * La couche réfléchissante d'un DVD : de l'aluminium sous 0,6 mm de polycarbonate, gravé de pistes en spirale
 * espacées de 740 nm. Ces pistes forment un réseau de diffraction : la lumière blanche se décompose en couleurs
 * selon l'angle entre la source, la piste et l'œil — d'où la croix irisée qui tourne avec le disque.
 *
 * On part d'un MeshPhysicalMaterial (métal poli + vernis = le polycarbonate, reflets de l'environnement HDR)
 * et on ajoute, dans le fragment shader, l'équation du réseau pour trois lumières :
 *     d · (sin θi + sin θo) = m · λ     (d = 740 nm, ordres m = 1, 2, 3)
 * projetée sur la tangente aux pistes en chaque point. La longueur d'onde obtenue est convertie en couleur
 * (approximation spectrale de Zucconi), pondérée par un lobe spéculaire radial : le reflet coloré forme
 * des rayons qui passent par le centre, comme sur un vrai disque.
 * Des rayures circulaires très fines (texture procédurale) font varier la rugosité et diffusent un peu les couleurs.
 */

export type DiffractionUniforms = {
  uCenter: { value: THREE.Vector3 };
  uScale: { value: number };
  uLightDir: { value: THREE.Vector3[] };
  uLightCol: { value: THREE.Color[] };
  uIntensity: { value: number };
  uRIn: { value: number };
  uROut: { value: number };
  uPitch: { value: number };
};

// Lumières de studio (directions dans le monde) qui produisent les couleurs : une boîte à lumière haute, deux latérales
export const DIFFRACTION_LIGHTS = [new THREE.Vector3(-0.35, 0.85, 0.55), new THREE.Vector3(0.9, 0.25, 0.4), new THREE.Vector3(-0.8, -0.2, 0.6)];
const LIGHT_COLORS = [new THREE.Color(1, 0.98, 0.95), new THREE.Color(0.75, 0.8, 0.9), new THREE.Color(0.55, 0.52, 0.5)];

let scratches: THREE.Texture | null = null;
// Rayures de manipulation : surtout tangentielles (on essuie un disque en tournant), quelques traits droits
export function scratchTexture() {
  if (scratches || typeof document === "undefined") return scratches!;
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  // fond : rugosité de base (canal vert), avec un léger voile non uniforme
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgb(120,120,120)");
  g.addColorStop(1, "rgb(104,104,104)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.lineCap = "round";
  for (let i = 0; i < 420; i++) {
    const r = S * (0.19 + rnd() * 0.3);
    const a = rnd() * Math.PI * 2;
    const len = 0.04 + rnd() * 0.5;
    ctx.strokeStyle = `rgba(255,255,255,${0.06 + rnd() * 0.22})`;
    ctx.lineWidth = 0.5 + rnd() * 0.9;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, r, a, a + len);
    ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI, l = 30 + rnd() * 180;
    ctx.strokeStyle = `rgba(255,255,255,${0.1 + rnd() * 0.25})`;
    ctx.lineWidth = 0.6 + rnd() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  scratches = new THREE.CanvasTexture(c);
  scratches.anisotropy = 8;
  return scratches;
}

export function diffractionMaterial(opts: { color?: THREE.ColorRepresentation; intensity?: number; rIn: number; rOut: number; roughness?: number } = { rIn: 0.0225, rOut: 0.0586 }) {
  const m = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? "#d5d8de",
    metalness: 1,
    roughness: opts.roughness ?? 0.32,
    roughnessMap: scratchTexture(),
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1,
    side: THREE.DoubleSide,
  });
  m.name = "DM_DisqueDiffraction";
  const uniforms: DiffractionUniforms = {
    uCenter: { value: new THREE.Vector3() },
    uScale: { value: 1 },
    uLightDir: { value: DIFFRACTION_LIGHTS.map((v) => v.clone().normalize()) },
    uLightCol: { value: LIGHT_COLORS },
    uIntensity: { value: opts.intensity ?? 1.6 },
    uRIn: { value: opts.rIn },
    uROut: { value: opts.rOut },
    uPitch: { value: 740 },
  };
  m.userData.uniforms = uniforms;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uCenter; uniform float uScale; uniform vec3 uLightDir[3]; uniform vec3 uLightCol[3];
uniform float uIntensity; uniform float uRIn; uniform float uROut; uniform float uPitch;
vec3 bump3y(vec3 x, vec3 yo) { vec3 y = 1.0 - x * x; return clamp(y - yo, 0.0, 1.0); }
// Approximation spectrale de Zucconi (6 bosses) : longueur d'onde (nm) -> couleur
vec3 spectral(float w) {
  if (w < 400.0 || w > 700.0) return vec3(0.0);
  float x = (w - 400.0) / 300.0;
  const vec3 c1 = vec3(3.54585104, 2.93225262, 2.41593945);
  const vec3 x1 = vec3(0.69549072, 0.49228336, 0.27699880);
  const vec3 y1 = vec3(0.02312639, 0.15225084, 0.52607955);
  const vec3 c2 = vec3(3.90307140, 3.21182957, 3.96587128);
  const vec3 x2 = vec3(0.11748627, 0.86755042, 0.66077860);
  const vec3 y2 = vec3(0.84897130, 0.88445281, 0.73949448);
  return bump3y(c1 * (x - x1), y1) + bump3y(c2 * (x - x2), y2);
}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `{
  vec3 P = -vViewPosition;
  vec3 Nd = normalize(normal);
  vec3 rel = P - uCenter;
  vec3 radial = rel - dot(rel, Nd) * Nd;
  float rr = length(radial) / uScale;
  radial = radial / max(length(radial), 1e-6);
  vec3 Tg = normalize(cross(Nd, radial));
  vec3 Vd = normalize(vViewPosition);
  float zone = smoothstep(uRIn, uRIn + 0.0006, rr) * (1.0 - smoothstep(uROut - 0.0005, uROut, rr));
  // fines variations concentriques (sessions, couches) : la surface n'est jamais parfaitement uniforme
  float bands = 0.82 + 0.18 * sin(rr * 2400.0) * sin(rr * 310.0 + 1.3);
  float layer = 1.0 - 0.22 * smoothstep(0.0448, 0.0452, rr) * (1.0 - smoothstep(0.0455, 0.0459, rr));
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    vec3 L = normalize(uLightDir[i]);
    vec3 H = normalize(L + Vd);
    float facing = max(dot(Nd, L), 0.0) * max(dot(Nd, Vd), 0.0);
    // lobe radial : la couleur naît là où la demi-direction est perpendiculaire à la piste
    float rad = dot(radial, H);
    float lobe = exp(-rad * rad / 0.045) * pow(max(dot(Nd, H), 0.0), 3.0);
    float u = abs(dot(Tg, L) + dot(Tg, Vd));
    vec3 col = vec3(0.0);
    for (int k = 1; k <= 3; k++) col += spectral(uPitch * u / float(k)) / float(k);
    acc += col * lobe * uLightCol[i] * (0.35 + facing);
  }
  outgoingLight += acc * zone * bands * layer * uIntensity * (0.7 + 0.6 * roughnessFactor);
}
#include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => "dreams-diffraction";
  return m;
}

// À appeler avant chaque rendu du maillage : centre du disque et lumières passés dans le repère de la caméra
const tmp = new THREE.Vector3();
export function bindDiffraction(mesh: THREE.Mesh, material: THREE.Material) {
  const u = material.userData.uniforms as DiffractionUniforms | undefined;
  if (!u) return;
  mesh.onBeforeRender = (_r, _s, camera) => {
    u.uCenter.value.setFromMatrixPosition(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
    u.uScale.value = tmp.setFromMatrixScale(mesh.matrixWorld).x;
    DIFFRACTION_LIGHTS.forEach((d, i) => u.uLightDir.value[i].copy(d).normalize().transformDirection(camera.matrixWorldInverse));
  };
}
