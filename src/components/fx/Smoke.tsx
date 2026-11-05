"use client";

import { useEffect, useRef, useState } from "react";
import { createScene, cssColor, GLSL_COMMON, mountCanvas } from "./gl";

/*
 * FAISCEAU — la fumée qui flotte dans la lumière du projecteur, avant la séance.
 * Des volutes lentes (bruit fractal déformé deux fois), éclairées par un cône de lumière venu d'en haut ;
 * la souris remue la fumée. Sert de décor aux écrans d'accueil (connexion, inscription).
 */
const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform vec3 uAccent;
uniform vec3 uBg;
uniform float uTime;
uniform float uIntro;
varying vec2 vUv;
${GLSL_COMMON}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.05;

  // La souris remue la fumée
  vec2 m = uMouse * vec2(uRes.x / uRes.y, 1.0) * 0.5;
  float dm = length(p - m);
  vec2 swirl = (p - m) * 0.9 * exp(-dm * dm * 5.0);

  vec2 q = vec2(fbm(p * 1.4 + vec2(0.0, t)), fbm(p * 1.4 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.4 + 3.5 * q + vec2(1.7, 9.2) + t * 1.4 + swirl), fbm(p * 1.4 + 3.5 * q + vec2(8.3, 2.8) - t + swirl));
  float f = fbm(p * 1.4 + 3.5 * r);

  // Cône de lumière qui descend du haut de l'écran
  float cone = (1.0 - smoothstep(0.0, 0.95, abs(p.x) / (0.25 + (0.6 - p.y) * 0.55))) * smoothstep(-0.9, 0.6, p.y);
  float smoke = smoothstep(0.35, 1.0, f);

  vec3 col = uBg;
  col += uAccent * smoke * (0.12 + cone * 0.55);
  col += uAccent * pow(smoke, 3.0) * cone * 0.5;
  col += uAccent * cone * 0.05;
  col += uAccent * 0.06 * exp(-dm * dm * 3.0);

  // Grain et vignette
  col += (hash(gl_FragCoord.xy + floor(uTime * 24.0)) - 0.5) * 0.04;
  col *= 1.0 - smoothstep(0.3, 1.4, length(p * vec2(0.8, 1.0)));
  col = mix(uBg, col, uIntro);

  gl_FragColor = vec4(col, 1.0);
}`;

export function Smoke({ className = "" }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const el = mountCanvas(host.current, "absolute inset-0 size-full");
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = matchMedia("(pointer: coarse)").matches;
    const uniforms = {
      uRes: { value: [1, 1] },
      uMouse: { value: [0, 0.2] },
      uAccent: { value: cssColor("--accent", [0.9, 0.7, 0.3]) },
      uBg: { value: cssColor("--background", [0.04, 0.04, 0.035]) },
      uTime: { value: 8 },
      uIntro: { value: calm ? 1 : 0 },
    };
    const target = [0, 0.2];
    const startedAt = performance.now();
    const scene = createScene({
      canvas: el,
      fragment: FRAGMENT,
      uniforms,
      maxDpr: touch ? 0.75 : 1,
      fps: touch ? 30 : 60,
      onFrame: (t, dt) => {
        if (!calm) uniforms.uTime.value = 8 + t;
        const k = 1 - Math.pow(0.02, dt);
        uniforms.uMouse.value[0] += (target[0] - uniforms.uMouse.value[0]) * k;
        uniforms.uMouse.value[1] += (target[1] - uniforms.uMouse.value[1]) * k;
        if (!calm) uniforms.uIntro.value = Math.min(1, (performance.now() - startedAt) / 2200);
      },
    });
    if (!scene) {
      el.remove();
      return;
    }
    setOn(true);
    const onMove = (e: PointerEvent) => {
      target[0] = (e.clientX / innerWidth - 0.5) * 2;
      target[1] = -(e.clientY / innerHeight - 0.5) * 2;
    };
    if (!calm) window.addEventListener("pointermove", onMove, { passive: true });
    const mo = new MutationObserver(() => {
      uniforms.uAccent.value = cssColor("--accent", [0.9, 0.7, 0.3]);
      uniforms.uBg.value = cssColor("--background", [0.04, 0.04, 0.035]);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      window.removeEventListener("pointermove", onMove);
      mo.disconnect();
      scene.destroy();
    };
  }, []);

  return <div ref={host} aria-hidden className={`transition-opacity duration-1000 ${on ? "opacity-100" : "opacity-0"} ${className}`} />;
}
