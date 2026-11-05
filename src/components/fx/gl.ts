import { Mesh, Program, Renderer, Triangle } from "ogl";

/*
 * Petit moteur commun aux effets WebGL de Dreams (OGL : ~25 Ko).
 * Un seul triangle plein écran et un fragment shader ; la boucle s'arrête quand le canvas sort de l'écran
 * ou que l'onglet est caché, et la résolution est plafonnée pour rester fluide sur les petites machines.
 */

export const VERTEX = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// Bruit et grain partagés par les shaders
export const GLSL_COMMON = /* glsl */ `
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}`;

// Adresse d'une image lisible par WebGL : les images TMDB passent par le relais /api/img (même origine).
export function glImage(src: string): string | null {
  const m = /^https:\/\/image\.tmdb\.org\/t\/p\/([a-z0-9]+)(\/[^?#]+)$/.exec(src);
  if (m) return `/api/img?s=${m[1]}&p=${encodeURIComponent(m[2])}`;
  return src.startsWith("/") ? src : null;
}

// Couleur CSS (#rrggbb ou #rgb) → vec3
export function cssColor(name: string, fallback: [number, number, number]): [number, number, number] {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const m = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(v);
  if (!m) return fallback;
  const hex = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

// Une toile neuve à chaque montage : un contexte WebGL libéré ne peut pas resservir.
export function mountCanvas(host: HTMLElement, className: string) {
  const canvas = document.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  return canvas;
}

export type GLScene = {
  renderer: Renderer;
  program: Program;
  start: () => void;
  stop: () => void;
  destroy: () => void;
};

export function createScene({
  canvas,
  fragment,
  uniforms,
  onFrame,
  maxDpr = 1.5,
  fps = 60,
}: {
  canvas: HTMLCanvasElement;
  fragment: string;
  uniforms: Record<string, { value: unknown }>;
  onFrame?: (t: number, dt: number) => boolean | void; // false : rien à dessiner pour l'instant
  maxDpr?: number;
  fps?: number;
}): GLScene | null {
  let renderer: Renderer;
  try {
    renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, maxDpr), alpha: false, antialias: false, powerPreference: "low-power" });
  } catch (e) {
    console.warn("[Dreams] WebGL indisponible", e);
    return null; // pas de WebGL : l'image de secours reste affichée
  }
  const gl = renderer.gl;
  const program = new Program(gl, { vertex: VERTEX, fragment, uniforms });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  const resize = () => {
    // On mesure le conteneur : OGL donne à la toile une taille fixe en pixels
    const box = canvas.parentElement ?? canvas;
    const { clientWidth: w, clientHeight: h } = box;
    if (!w || !h) return;
    renderer.setSize(w, h);
    const res = uniforms.uRes?.value as number[] | undefined;
    if (res) {
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
    }
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement ?? canvas);
  resize();

  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let running = false;
  const step = 1000 / fps;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = now - last;
    last = now;
    acc += dt;
    if (acc < step - 1) return;
    acc = 0;
    if (onFrame?.(now / 1000, Math.min(dt, 64) / 1000) === false) return;
    renderer.render({ scene: mesh });
  };
  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // Pause hors de l'écran et onglet caché
  let visible = true;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !document.hidden) start();
    else stop();
  });
  io.observe(canvas);
  const onVis = () => (document.hidden || !visible ? stop() : start());
  document.addEventListener("visibilitychange", onVis);

  return {
    renderer,
    program,
    start,
    stop,
    destroy: () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}
