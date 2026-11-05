"use client";
/* eslint-disable @next/next/no-img-element */

import { Texture } from "ogl";
import { useEffect, useRef, useState } from "react";
import { createScene, cssColor, glImage, GLSL_COMMON, mountCanvas } from "./gl";

/*
 * PROJECTION — l'image d'un film, projetée comme dans une salle.
 * Écran à peine bombé, tremblement de la pellicule dans le couloir (24 images/s), scintillement de la lampe,
 * aberration chromatique sur les bords, grain, poussières, et le faisceau chaud du projecteur qui suit la souris.
 * En descendant, l'image recule et s'éteint doucement, comme un fondu au noir.
 * Sans WebGL (ou si l'on préfère moins d'animations) : l'image fixe, sans rien perdre.
 */
const FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uMouse;
uniform vec3 uAccent;
uniform float uTime;
uniform float uScroll;
uniform float uIntro;
uniform float uFocus;
varying vec2 vUv;
${GLSL_COMMON}

vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  return (uv - 0.5) * s + vec2(0.5, 0.5 + uFocus);
}

void main() {
  vec2 c = vUv - 0.5;
  float r2 = dot(c, c);
  float frame = floor(uTime * 24.0);

  // Écran à peine bombé, léger recul au défilement, parallaxe à la souris
  vec2 uv = 0.5 + c * (1.0 - 0.035 * r2);
  float zoom = 1.07 + uScroll * 0.1;
  uv = (uv - 0.5) / zoom + 0.5 + uMouse * vec2(0.022, 0.016);
  // La pellicule tremble un peu dans le couloir
  uv += (vec2(hash(vec2(frame, 7.0)), hash(vec2(frame, 1.0))) - 0.5) * vec2(0.0006, 0.0011);
  vec2 t = cover(uv);

  // Aberration chromatique, plus forte sur les bords
  vec2 ca = c * 0.006 * (0.25 + r2 * 3.0);
  vec3 col = vec3(texture2D(tMap, t + ca).r, texture2D(tMap, t).g, texture2D(tMap, t - ca).b);

  // Scintillement de la lampe
  col *= 0.97 + 0.03 * hash(vec2(frame, 3.0));

  // Faisceau chaud venu d'en haut, qui suit la souris
  float aspect = uRes.x / uRes.y;
  vec2 lp = vec2(0.5 + uMouse.x * 0.35, 1.25);
  float beam = 1.0 - smoothstep(0.0, 1.1, distance(vUv * vec2(aspect, 1.0), lp * vec2(aspect, 1.0)));
  col += uAccent * beam * beam * 0.16;

  // Grain argentique
  col += (hash(vUv * uRes + frame * 17.0) - 0.5) * 0.075;

  // Poussières : quelques points de lumière, une image sur deux
  vec2 g = vUv * vec2(aspect, 1.0) * 16.0;
  float d = hash(floor(g) + frame);
  if (d > 0.9982) col += vec3(0.75) * (1.0 - smoothstep(0.0, 0.12, length(fract(g) - 0.5)));

  // Vignette de salle
  float vig = 1.0 - smoothstep(0.2, 1.0, length(c * vec2(1.05, 1.35)));
  col *= mix(0.28, 1.0, vig);

  // Fondu au noir quand on descend
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(l), uScroll * 0.65);
  col *= 1.0 - uScroll * 0.6;

  // La lampe chauffe à l'arrivée : l'image s'allume en vacillant
  float intro = smoothstep(0.0, 1.0, uIntro);
  col *= intro * (1.0 - (1.0 - intro) * 0.6 * hash(vec2(frame, 9.0)));

  gl_FragColor = vec4(col, 1.0);
}`;

export function Projection({ src, alt = "", className = "", focus = 0 }: { src: string; alt?: string; className?: string; focus?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const glSrc = glImage(src);
    if (!host.current || !glSrc) return;
    const el = mountCanvas(host.current, "absolute inset-0 size-full");
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = matchMedia("(pointer: coarse)").matches;

    const texture = { current: null as Texture | null };
    const uniforms = {
      tMap: { value: null as Texture | null },
      uRes: { value: [1, 1] },
      uImg: { value: [16, 9] },
      uMouse: { value: [0, 0] },
      uAccent: { value: cssColor("--accent", [0.9, 0.7, 0.3]) },
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uIntro: { value: calm ? 1 : 0 },
      uFocus: { value: focus },
    };
    const target = [0, 0];
    let loaded = false;
    let loadedAt = 0;

    const scene = createScene({
      canvas: el,
      fragment: FRAGMENT,
      uniforms,
      maxDpr: touch ? 1 : 1.5,
      fps: touch ? 30 : 60,
      onFrame: (t, dt) => {
        if (!loaded) return false;
        uniforms.uTime.value = calm ? 0 : t;
        if (touch && !calm) {
          // Sur téléphone, une lente dérive à la place de la souris
          target[0] = Math.sin(t * 0.25) * 0.35;
          target[1] = Math.cos(t * 0.18) * 0.25;
        }
        const k = 1 - Math.pow(0.001, dt);
        uniforms.uMouse.value[0] += (target[0] - uniforms.uMouse.value[0]) * k * 0.6;
        uniforms.uMouse.value[1] += (target[1] - uniforms.uMouse.value[1]) * k * 0.6;
        if (!calm) uniforms.uIntro.value = Math.min(1, (performance.now() - loadedAt) / 1800);
        const r = el.getBoundingClientRect();
        uniforms.uScroll.value = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
      },
    });
    if (!scene) {
      el.remove();
      return;
    }

    const gl = scene.renderer.gl;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      texture.current = new Texture(gl, { image: img, generateMipmaps: false, minFilter: gl.LINEAR, magFilter: gl.LINEAR, wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE });
      uniforms.tMap.value = texture.current;
      uniforms.uImg.value = [img.naturalWidth, img.naturalHeight];
      loaded = true;
      loadedAt = performance.now();
      setReady(true);
    };
    img.src = glSrc;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target[0] = e.clientX / innerWidth - 0.5;
      target[1] = -(e.clientY / innerHeight - 0.5);
    };
    if (!touch && !calm) window.addEventListener("pointermove", onMove, { passive: true });

    // Le faisceau prend la couleur du thème choisi
    const mo = new MutationObserver(() => (uniforms.uAccent.value = cssColor("--accent", [0.9, 0.7, 0.3])));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      window.removeEventListener("pointermove", onMove);
      mo.disconnect();
      scene.destroy();
    };
  }, [src, focus]);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {/* Image de secours, affichée tout de suite (et seule, sans WebGL) */}
      <img src={src} alt={alt} className={`absolute inset-0 size-full scale-[1.07] object-cover transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-70"}`} />
      <div ref={host} className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
