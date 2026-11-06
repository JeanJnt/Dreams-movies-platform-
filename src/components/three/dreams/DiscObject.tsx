"use client";

import { useFrame } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CaseFilm } from "../cases/art";
import { discLabelTexture, type DiscTemplate } from "../models/discTemplates";
import { buildRealDisc } from "./disc";

/*
 * Un disque physique dans la scène. Sa rotation suit une petite mécanique :
 *   - une vitesse de croisière (lente, ou nulle si l'utilisateur réduit les animations) ;
 *   - une impulsion quand on le lance du doigt ou de la souris, qui retombe par frottement (inertie) ;
 *   - une bascule douce vers le pointeur.
 * La poignée (ref) permet aux scènes de le lancer, de le freiner ou de lire sa vitesse.
 */
export type DiscHandle = { spin: (impulse: number) => void; setCruise: (v: number) => void; group: THREE.Group | null };

export const DiscObject = forwardRef<DiscHandle, { film: CaseFilm; template?: DiscTemplate; cruise?: number; tilt?: boolean; scale?: number }>(function DiscObject(
  { film, template = "photo", cruise = 0.35, tilt = true, scale = 1 },
  ref,
) {
  const parts = useMemo(() => buildRealDisc(null), []);
  const holder = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const v = useRef({ speed: cruise, cruise, extra: 0 });
  const calm = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => () => parts.dispose(), [parts]);
  useEffect(() => {
    v.current.cruise = calm ? 0 : cruise;
  }, [cruise, calm]);
  // l'étiquette du film, imprimée dans un canevas
  useEffect(() => {
    let alive = true;
    let made: THREE.Texture | null = null;
    discLabelTexture(film, template).then((t) => {
      if (!alive) return t.dispose();
      made = t;
      parts.label.map = t;
      parts.label.needsUpdate = true;
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [film, template, parts]);

  useImperativeHandle(ref, () => ({
    spin: (impulse: number) => {
      v.current.extra += impulse;
    },
    setCruise: (c: number) => {
      v.current.cruise = calm ? 0 : c;
    },
    get group() {
      return holder.current;
    },
  }));

  useFrame((state, dt) => {
    const s = v.current;
    // le surplus de vitesse retombe par frottement (≈ 1,6 s pour revenir à la croisière)
    s.extra *= Math.pow(0.18, dt);
    s.speed = s.cruise + s.extra;
    if (spinner.current) spinner.current.rotation.z -= s.speed * dt;
    if (tilt && holder.current && !calm) {
      const p = state.pointer;
      holder.current.rotation.x = THREE.MathUtils.damp(holder.current.rotation.x, -p.y * 0.22, 3, dt);
      holder.current.rotation.y = THREE.MathUtils.damp(holder.current.rotation.y, p.x * 0.3, 3, dt);
    }
  });

  return (
    <group ref={holder} scale={scale}>
      <group ref={spinner}>
        <primitive object={parts.group} />
      </group>
    </group>
  );
});
