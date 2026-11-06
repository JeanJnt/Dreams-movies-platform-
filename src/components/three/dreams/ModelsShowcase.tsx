"use client";

import { Environment, PerspectiveCamera, View } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CASE_SIZES, type CaseSize } from "@/lib/case-thickness";
import type { CaseFilm } from "../cases/art";
import { DISC_TEMPLATES, type DiscTemplate } from "../models/discTemplates";
import { CaseObject, useCaseAnim, type CaseFilmInfo } from "./CaseObject";
import { DiscObject } from "./DiscObject";
import { JACKET_STYLES, type JacketStyle } from "./jacket";

/*
 * Le catalogue des modèles : toutes les maquettes de jaquette, toutes les étiquettes de disque,
 * toutes les épaisseurs de boîtier, rendues en vraie 3D.
 * Un seul canevas WebGL pour toute la page : chaque vignette est une « vue » (drei View) qui suit sa case HTML.
 * Chaque objet tourne doucement ; au survol, il se tourne vers nous.
 */

function Lights() {
  return (
    <>
      <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.9} />
      <directionalLight position={[-3, 4, 4]} intensity={1.3} />
    </>
  );
}

// Un plateau tournant : oscille lentement, se fige face à nous au survol
function Turn({ children, hovered, base = -0.45, amp = 0.55, speed = 0.35, phase = 0 }: { children: React.ReactNode; hovered: boolean; base?: number; amp?: number; speed?: number; phase?: number }) {
  const g = useRef<THREE.Group>(null);
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useFrame((s, dt) => {
    if (!g.current) return;
    const target = hovered || calm ? base * 0.4 : base + Math.sin(s.clock.elapsedTime * speed + phase) * amp;
    g.current.rotation.y = THREE.MathUtils.damp(g.current.rotation.y, target, 3, dt);
  });
  return <group ref={g}>{children}</group>;
}

function Tile({ label, sub, children, className = "h-[22rem]" }: { label: string; sub?: string; children: (hovered: boolean) => React.ReactNode; className?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <figure className="group" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className={`card relative overflow-hidden !bg-[radial-gradient(80%_70%_at_50%_40%,#18181b,#050505)] ${className}`}>
        <View className="absolute inset-0">{children(hovered)}</View>
      </div>
      <figcaption className="mt-3">
        <span className="block text-[15px]">{label}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </figcaption>
    </figure>
  );
}

function CaseView({ film, style, size, hovered, open = 0, phase = 0, view = "face" }: { film: CaseFilmInfo; style?: JacketStyle; size?: CaseSize; hovered: boolean; open?: number; phase?: number; view?: "face" | "tranche" }) {
  const anim = useCaseAnim();
  useEffect(() => {
    gsap.to(anim.current, { open, out: open ? 1 : 0, spin: open ? 0.3 : 0, duration: 1.2, ease: "power3.inOut", delay: 0.4 });
  }, [open, anim]);
  return (
    <>
      <PerspectiveCamera makeDefault fov={24} position={[0, 0.05, open ? 7.4 : 5]} />
      <Lights />
      <Turn hovered={hovered} base={view === "tranche" ? 1.15 : open ? -0.1 : -0.4} amp={view === "tranche" ? 0.35 : open ? 0.15 : 0.5} phase={phase}>
        <group scale={10} position={[open ? 0.3 : 0, 0, 0]}>
          <CaseObject film={film} anim={anim} styleOverride={style} sizeOverride={size} lite={!open} />
        </group>
      </Turn>
    </>
  );
}

function DiscView({ film, template, hovered, phase }: { film: CaseFilm; template: DiscTemplate; hovered: boolean; phase: number }) {
  return (
    <>
      <PerspectiveCamera makeDefault fov={26} position={[0, 0, 3.6]} />
      <Lights />
      <group rotation={[-0.35, 0, 0]}>
        <Turn hovered={hovered} base={-0.25} amp={0.4} speed={0.3} phase={phase}>
          <DiscObject film={film} template={template} scale={11} cruise={hovered ? 0.6 : 0.15} tilt={false} />
        </Turn>
      </group>
    </>
  );
}

export function ModelsShowcase({ films }: { films: CaseFilm[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const f = (i: number) => films[i % films.length];
  const sizes = Object.values(CASE_SIZES);

  return (
    <div ref={root} className="relative space-y-24">
      <section aria-labelledby="m-jaquettes">
        <h2 id="m-jaquettes" className="text-[clamp(2rem,4vw,3rem)] leading-none">
          Six maquettes de jaquette
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-[var(--text-2)]">Une même tranche pour toute la collection, une face propre à chaque film. Chaque film reçoit toujours la même maquette, choisie d&apos;après lui et ses images.</p>
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
          {JACKET_STYLES.map((s, i) => (
            <Tile key={s.key} label={s.label} sub={f(i).title}>
              {(h) => <CaseView film={f(i)} style={s.key} hovered={h} phase={i} />}
            </Tile>
          ))}
        </div>
      </section>

      <section aria-labelledby="m-epaisseurs">
        <h2 id="m-epaisseurs" className="text-[clamp(2rem,4vw,3rem)] leading-none">
          Cinq épaisseurs de boîtier
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-[var(--text-2)]">Une seule famille, 135 × 190 mm. L&apos;épaisseur suit l&apos;édition : durée du film, nombre de disques, série ou coffret.</p>
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-5">
          {sizes.map((s, i) => (
            <Tile key={s.mm} label={`${s.name} · ${s.mm} mm`} sub={`${s.discs} disque${s.discs > 1 ? "s" : ""}`} className="h-[20rem]">
              {(h) => <CaseView film={f(i + 2)} size={s} hovered={h} phase={i * 0.7} view="tranche" />}
            </Tile>
          ))}
        </div>
      </section>

      <section aria-labelledby="m-disques">
        <h2 id="m-disques" className="text-[clamp(2rem,4vw,3rem)] leading-none">
          Dix étiquettes de disque
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-[var(--text-2)]">Sérigraphies imprimées sur l&apos;anneau du disque ; certaines laissent le métal à nu. Survolez un disque pour le faire tourner.</p>
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-5">
          {DISC_TEMPLATES.map((t, i) => (
            <Tile key={t.key} label={t.label} sub={f(i).title} className="h-[16rem]">
              {(h) => <DiscView film={f(i)} template={t.key} hovered={h} phase={i * 0.6} />}
            </Tile>
          ))}
        </div>
      </section>

      <section aria-labelledby="m-ouvert">
        <h2 id="m-ouvert" className="text-[clamp(2rem,4vw,3rem)] leading-none">
          À l&apos;intérieur
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] text-[var(--text-2)]">Coque, moyeu à douze pétales, agrafes du livret, plateaux pivotants des éditions à plusieurs disques.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Tile label="Standard, ouvert" sub="Un disque, livret sous les agrafes" className="h-[26rem]">
            {(h) => <CaseView film={f(1)} size={CASE_SIZES.standard} hovered={h} open={0.95} />}
          </Tile>
          <Tile label="Collector, ouvert" sub="Trois disques sur deux plateaux pivotants" className="h-[26rem]">
            {(h) => <CaseView film={f(3)} size={CASE_SIZES.triple} hovered={h} open={0.95} />}
          </Tile>
        </div>
      </section>

      {/* le canevas unique, derrière toute la page, qui dessine chaque vue à sa place */}
      {ready && (
        <Canvas className="!pointer-events-none !fixed !inset-0" eventSource={root as React.RefObject<HTMLElement>} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.02 }}>
          <Suspense fallback={null}>
            <View.Port />
          </Suspense>
        </Canvas>
      )}
    </div>
  );
}
