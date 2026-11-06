"use client";

import { useGSAP } from "@gsap/react";
import { Environment } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { CaseFilm } from "../cases/art";
import { DiscObject, type DiscHandle } from "./DiscObject";
import { discFor, jacketStyle } from "./jacket";

gsap.registerPlugin(useGSAP, SplitText);

/*
 * La platine de l'accueil : les derniers films vus, sous forme de disques.
 * Le disque du moment est au premier plan et tourne ; les autres s'étagent dans la profondeur, en diagonale.
 * On passe d'un film à l'autre avec les flèches, les boutons, le clavier ou en glissant ; on ouvre la fiche
 * en touchant le disque : il accélère, vient vers nous, et la page du film prend le relais.
 * (Référence : l'index de disques d'A24 — ici adapté à un journal personnel, et toujours pilotable sans souris.)
 */
export type IndexFilm = CaseFilm & { meta: { label: string; value: string }[]; date?: string | null };

const S = 12; // échelle : un disque de 120 mm mesure 1,44 unité
function slot(k: number, narrow: boolean) {
  const a = Math.abs(k);
  if (narrow) return { x: k * 0.85, y: 0.1 - a * 0.06, z: -a * 1.4, s: k === 0 ? 0.6 : 0.42, ry: -0.35 + k * 0.08, rx: -0.38 };
  return { x: 0.95 + k * 0.62, y: -k * 0.42 + 0.05, z: -a * 1.05, s: k === 0 ? 1 : 0.6, ry: -0.55 + k * 0.06, rx: -0.42 + k * 0.03 };
}

function Discs({ films, current, onPick, handles, narrow, launching }: { films: IndexFilm[]; current: number; onPick: (i: number) => void; handles: React.MutableRefObject<(DiscHandle | null)[]>; narrow: boolean; launching: boolean }) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const placed = useRef(false);
  // chaque changement de film : les disques glissent vers leur nouvelle place (GSAP), en léger décalé
  useEffect(() => {
    groups.current.forEach((g, i) => {
      if (!g) return;
      const k = i - current;
      const p = slot(k, narrow);
      const vis = Math.abs(k) <= (narrow ? 1 : 3);
      const d = placed.current ? 0.9 : 0;
      gsap.to(g.position, { x: p.x, y: p.y, z: p.z, duration: d, ease: "power3.inOut", delay: placed.current ? Math.abs(k) * 0.03 : 0, overwrite: true });
      gsap.to(g.scale, { x: p.s * S, y: p.s * S, z: p.s * S, duration: d, ease: "power3.inOut", overwrite: true });
      gsap.to(g.rotation, { x: p.rx, y: p.ry, duration: d, ease: "power3.inOut", overwrite: true });
      g.visible = true;
      gsap.to(g.userData, { o: vis ? 1 : 0, duration: d * 0.6, onUpdate: () => (g.visible = g.userData.o > 0.02) });
      handles.current[i]?.setCruise(k === 0 ? 0.45 : 0.08);
    });
    placed.current = true;
  }, [current, narrow, handles]);
  // lancement : le disque actif accélère et vient vers la caméra
  useEffect(() => {
    if (!launching) return;
    const g = groups.current[current];
    if (!g) return;
    handles.current[current]?.spin(9);
    gsap.to(g.position, { x: 0, y: 0, z: 2.2, duration: 0.75, ease: "power3.in" });
    gsap.to(g.rotation, { x: 0, y: 0, duration: 0.6, ease: "power2.out" });
  }, [launching, current, handles]);
  return (
    <>
      {films.map((f, i) => (
        <group
          key={f.id}
          ref={(g) => {
            groups.current[i] = g;
            if (g) g.userData.o ??= 1;
          }}
          onClick={(e) => {
            e.stopPropagation();
            onPick(i);
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "")}
        >
          <DiscObject ref={(h) => void (handles.current[i] = h)} film={f} template={discFor(jacketStyle(f))} cruise={i === current ? 0.45 : 0.08} tilt={i === current} />
        </group>
      ))}
    </>
  );
}

function Light() {
  const l = useRef<THREE.DirectionalLight>(null);
  useFrame((s) => {
    if (l.current) l.current.position.set(-2 + s.pointer.x * 1.5, 3 + s.pointer.y, 4);
  });
  return <directionalLight ref={l} intensity={1.2} />;
}

export function DiscIndex({ films }: { films: IndexFilm[] }) {
  const [current, setCurrent] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [gl, setGl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const handles = useRef<(DiscHandle | null)[]>([]);
  const root = useRef<HTMLElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const f = films[current];

  useEffect(() => {
    try {
      setGl(Boolean(document.createElement("canvas").getContext("webgl2")));
    } catch {
      setGl(false);
    }
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setNarrow(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (root.current) io.observe(root.current);
    return () => {
      mq.removeEventListener("change", fn);
      io.disconnect();
    };
  }, []);

  // le générique change : l'ancien titre sort par le haut, le nouveau monte (SplitText, lignes masquées)
  useGSAP(
    () => {
      const el = info.current;
      if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const h = el.querySelector("[data-title]") as HTMLElement | null;
      if (h) {
        const split = SplitText.create(h, { type: "lines,words", mask: "lines" });
        gsap.from(split.words, { yPercent: 110, duration: 0.7, ease: "power4.out", stagger: 0.025 });
      }
      gsap.from(el.querySelectorAll("[data-line]"), { autoAlpha: 0, y: 8, duration: 0.45, ease: "power3.out", stagger: 0.04, delay: 0.1 });
    },
    { dependencies: [current], revertOnUpdate: true },
  );

  const go = useCallback((i: number) => setCurrent((i + films.length) % films.length), [films.length]);
  const open = useCallback(() => {
    if (launching) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calm) return router.push(f.href);
    setLaunching(true);
    gsap.to(info.current, { autoAlpha: 0, x: -20, duration: 0.35, ease: "power2.in" });
    router.prefetch(f.href);
    setTimeout(() => router.push(f.href), 760);
  }, [launching, router, f.href]);
  const pick = (i: number) => (i === current ? open() : go(i));

  // glisser : lance le disque ; au-delà de 60 px, change de film
  const drag = useRef<{ x: number; t: number; moved: number } | null>(null);
  const onDown = (e: React.PointerEvent) => (drag.current = { x: e.clientX, t: performance.now(), moved: 0 });
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.moved += dx;
    handles.current[current]?.spin(dx * 0.02);
    d.x = e.clientX;
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved < -60) go(current + 1);
    else if (d.moved > 60) go(current - 1);
  };

  return (
    <section
      ref={root}
      className="relative -mx-[var(--gutter)] min-h-[min(92svh,860px)] overflow-hidden md:mx-0"
      aria-roledescription="carrousel"
      aria-label="Mes derniers films vus"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(current + 1);
        if (e.key === "ArrowLeft") go(current - 1);
      }}
    >
      {/* la scène */}
      <div className="absolute inset-0 touch-pan-y" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {gl && (
          <Canvas frameloop={visible ? "always" : "never"} dpr={[1, 1.75]} camera={{ fov: 30, position: [0, 0, 5.4] }} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
            <Suspense fallback={null}>
              <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.85} />
              <Light />
              <group position={narrow ? [0, 0.72, 0] : [0, 0, 0]}>
                <Discs films={films} current={current} onPick={pick} handles={handles} narrow={narrow} launching={launching} />
              </group>
            </Suspense>
          </Canvas>
        )}
      </div>
      {/* lumière d'ambiance teintée par le film */}
      <div className="pointer-events-none absolute inset-0 transition-[background] duration-700" style={{ background: `radial-gradient(55% 60% at 68% 45%, color-mix(in srgb, ${f.color ?? "#555"} 22%, transparent), transparent 70%)` }} aria-hidden />

      {/* le générique du film */}
      <div className="pointer-events-none relative z-10 flex min-h-[min(92svh,860px)] flex-col justify-end px-[var(--gutter)] pt-[46svh] pb-10 md:justify-center md:px-0 md:pt-16 md:pb-16">
        <div ref={info} key={f.id} className="pointer-events-auto max-w-[34rem]" aria-live="polite">
          <p data-line className="text-[14px] text-muted">
            {f.date ? `Vu le ${f.date}` : "Récemment vu"}
          </p>
          <h1 data-title className="mt-3 text-[clamp(2.8rem,6.4vw,6.2rem)] leading-[0.95]">
            {f.title}
          </h1>
          {f.originalTitle && f.originalTitle !== f.title && (
            <p data-line className="serif mt-2 text-[1.3rem] text-[var(--text-2)]">
              {f.originalTitle}
            </p>
          )}
          <dl data-line className="credits mt-7">
            {f.meta.map((m) => (
              <Fragment key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </Fragment>
            ))}
          </dl>
          <div data-line className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={f.href} className="btn btn-primary" onClick={(e) => (e.preventDefault(), open())}>
              Ouvrir la fiche
            </Link>
            <div className="flex gap-1.5">
              <button onClick={() => go(current - 1)} className="btn !size-11 !p-0" aria-label="Film précédent">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button onClick={() => go(current + 1)} className="btn !size-11 !p-0" aria-label="Film suivant">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* sans WebGL : l'affiche du film */}
      {gl === false && f.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/img?s=w500&p=${encodeURIComponent(f.poster)}`} alt="" className="poster absolute top-1/2 right-[8%] w-[26%] -translate-y-1/2" />
      )}
      {/* la frise des films : où l'on en est */}
      <div className="absolute right-[var(--gutter)] bottom-6 z-10 hidden gap-1.5 md:right-0 md:flex" role="tablist" aria-label="Choisir un film">
        {films.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={i === current} aria-label={x.title} onClick={() => go(i)} className="group flex h-8 items-center px-0.5">
            <span className={`block h-px transition-all duration-300 ${i === current ? "w-10 bg-[image:var(--marker)]" : "w-5 bg-white/25 group-hover:bg-white/60"}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
