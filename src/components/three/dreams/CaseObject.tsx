"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { caseSize, type CaseSize } from "@/lib/case-thickness";
import { booklet as bookletArt, type CaseFilm } from "../cases/art";
import { discLabelTexture, type DiscTemplate } from "../models/discTemplates";
import { buildDreamsCase, caseMaterials, type DreamsCase } from "./caseModel";
import { discFor, dreamsJacket, jacketStyle, type JacketStyle } from "./jacket";
import type { DvdMaterials } from "../models/dvdStandard";

/*
 * Un boîtier DVD habillé pour un film.
 * L'état mécanique (ouverture du couvercle, sortie du disque, rotation du disque sorti) vit dans `anim` :
 * un simple objet que les timelines GSAP de la scène font varier, lu ici à chaque image.
 *   open : 0 fermé → 1 ouvert à 150°
 *   out  : 0 disque sur son moyeu → 1 disque sorti, posé à droite du boîtier, face vers nous
 *   spin : vitesse de rotation du disque (tours/s, quand il est sorti)
 */
export type CaseAnim = { open: number; out: number; spin: number };
export type CaseFilmInfo = CaseFilm & { edition?: string | null; caseType?: string | null; mediaType?: string | null };

export function CaseObject({ film, anim, template, onReady, styleOverride, sizeOverride, lite = false }: { film: CaseFilmInfo; anim: React.MutableRefObject<CaseAnim>; template?: DiscTemplate; onReady?: (c: DreamsCase) => void; styleOverride?: JacketStyle; sizeOverride?: CaseSize; lite?: boolean }) {
  const size = sizeOverride ?? caseSize({ runtime: film.runtime, mediaType: film.mediaType, edition: film.edition, caseType: film.caseType });
  const [base, setBase] = useState<DvdMaterials | null>(null);
  useEffect(() => {
    let alive = true;
    caseMaterials().then((m) => alive && setBase(m.base));
    return () => {
      alive = false;
    };
  }, []);
  const model = useMemo(() => (base ? buildDreamsCase(size.mm, size.discs, base) : null), [base, size.mm, size.discs]);
  useEffect(() => () => model?.dispose(), [model]);
  useEffect(() => {
    if (model) onReady?.(model);
  }, [model, onReady]);

  // impressions : jaquette, livret, étiquettes (le disque principal suit la maquette de la jaquette)
  const style = styleOverride ?? jacketStyle(film);
  useEffect(() => {
    if (!model) return;
    let alive = true;
    const made: THREE.Texture[] = [];
    const keep = (t: THREE.Texture) => (alive ? (made.push(t), true) : (t.dispose(), false));
    dreamsJacket(film, size.mm, style, lite ? 0.5 : 1).then((j) => {
      if (!keep(j.texture)) return;
      model.jacket.map = j.texture;
      model.jacket.needsUpdate = true;
    });
    if (!lite) bookletArt(film).then((t) => {
      if (!keep(t)) return;
      model.booklet.map = t;
      model.booklet.needsUpdate = true;
    });
    const others: DiscTemplate[] = ["numero", "sillons", "argent"];
    // en mode léger (défilés), seul le disque principal est imprimé
    model.discs.slice(0, lite ? 1 : undefined).forEach((d, i) =>
      discLabelTexture(film, i === 0 ? (template ?? discFor(style)) : others[(i - 1) % others.length]).then((t) => {
        if (!keep(t)) return;
        d.label.map = t;
        d.label.needsUpdate = true;
      }),
    );
    return () => {
      alive = false;
      made.forEach((t) => t.dispose());
    };
  }, [model, film, size.mm, style, template, lite]);

  const spinAngle = useRef(0);
  useFrame((_, dt) => {
    if (!model) return;
    const a = anim.current;
    if (model.lid) model.lid.rotation.y = -a.open * 2.62;
    const disc = model.discs[0].group;
    const T = model.spec.T;
    // trajectoire du disque : il se soulève du moyeu, sort par l'ouverture, se pose à droite face à nous
    const lift = THREE.MathUtils.smoothstep(a.out, 0, 0.35);
    const slide = THREE.MathUtils.smoothstep(a.out, 0.25, 1);
    // sorti, il vient vers nous, au-dessus du boîtier ouvert, légèrement tourné vers la lumière
    disc.position.set(model.discSlot.x + slide * 0.07, model.discSlot.y + slide * 0.012, model.discSlot.z + lift * (T * 0.5 + 0.008) + slide * 0.075);
    spinAngle.current -= a.spin * Math.PI * 2 * dt * slide;
    disc.rotation.set(-slide * 0.12, -slide * 0.32, spinAngle.current);
  });

  if (!model) return null;
  return <primitive object={model.root} />;
}

export function useCaseAnim(init: Partial<CaseAnim> = {}) {
  return useRef<CaseAnim>({ open: 0, out: 0, spin: 0, ...init });
}
