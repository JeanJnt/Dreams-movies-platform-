"use client";

import { useGSAP } from "@gsap/react";
import { ContactShadows, Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { Observer } from "gsap/Observer";
import Link from "next/link";
import { memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { caseSize } from "@/lib/case-thickness";
import { CaseObject, useCaseAnim, type CaseFilmInfo } from "./CaseObject";

gsap.registerPlugin(useGSAP, Observer);

/*
 * Le défilé de la collection : les boîtiers alignés en perspective, comme une rangée qu'on feuillette.
 * Le boîtier du centre se tourne vers nous, s'ouvre, et son disque sort en tournant ; les autres restent fermés,
 * de biais, chacun à son épaisseur. On fait défiler à la molette, au doigt, au clavier, avec les flèches
 * ou avec le curseur. La position est une valeur continue animée par GSAP : les boîtiers glissent, ils ne sautent pas.
 * Seuls les boîtiers proches du centre sont construits (fenêtre de ±4), avec des jaquettes en demi-résolution.
 */
export type ParadeRow = { film: CaseFilmInfo; label: string; editionName: string | null; director: string | null };

const WINDOW = 4;

const ParadeCase = memo(function ParadeCase({ row, index, pos, isCurrent, onPick }: { row: ParadeRow; index: number; pos: React.MutableRefObject<{ v: number }>; isCurrent: boolean; onPick: (i: number) => void }) {
  const g = useRef<THREE.Group>(null);
  const anim = useCaseAnim();
  // le boîtier du centre s'ouvre et sort son disque ; les autres se referment
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = gsap.timeline({ delay: isCurrent ? 0.35 : 0 });
    if (isCurrent) t.to(anim.current, { open: 0.72, duration: calm ? 0 : 0.8, ease: "power3.inOut" }).to(anim.current, { out: 1, duration: calm ? 0 : 0.9, ease: "power2.inOut" }, 0.35).to(anim.current, { spin: calm ? 0 : 0.35, duration: 1 }, 0.9);
    else t.to(anim.current, { out: 0, spin: 0, duration: 0.45, ease: "power2.inOut" }).to(anim.current, { open: 0, duration: 0.5, ease: "power3.inOut" }, 0.2);
    return () => void t.kill();
  }, [isCurrent, anim]);
  useFrame(() => {
    const gr = g.current;
    if (!gr) return;
    const k = index - pos.current.v;
    const a = Math.abs(k);
    const sgn = Math.sign(k);
    // couverture en éventail : écart plus grand autour du centre, rotation vers le centre, recul en profondeur
    gr.position.set(sgn * (Math.min(a, 1) * 1.55 + Math.max(0, a - 1) * 0.72), 0, -Math.min(a, 1) * 0.9 - Math.max(0, a - 1) * 0.35);
    gr.rotation.y = -sgn * Math.min(a, 1) * 1.05 + (a < 0.5 ? -0.18 * (1 - a * 2) : 0);
    gr.visible = a <= WINDOW + 0.5;
  });
  return (
    <group
      ref={g}
      onClick={(e) => {
        e.stopPropagation();
        onPick(index);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <group scale={10}>
        <CaseObject film={row.film} anim={anim} lite />
      </group>
    </group>
  );
});

// la caméra recule sur un écran étroit : le boîtier ouvert et son disque doivent tenir dans le cadre
function CamFit() {
  const { camera, size } = useThree();
  useFrame((_, dt) => {
    const aspect = size.width / size.height;
    const z = Math.max(7.2, 8.4 / Math.max(0.4, aspect));
    camera.position.z = THREE.MathUtils.damp(camera.position.z, z, 4, dt);
  });
  return null;
}

export function CaseParade({ rows, start = 0 }: { rows: ParadeRow[]; start?: number }) {
  const [current, setCurrent] = useState(start);
  const pos = useRef({ v: start });
  const stage = useRef<HTMLDivElement>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(true);
  const cur = rows[current];

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(rows.length - 1, i));
      setCurrent(n);
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(pos.current, { v: n, duration: calm ? 0 : 0.7, ease: "power3.out", overwrite: true });
    },
    [rows.length],
  );

  useEffect(() => {
    try {
      setGl(Boolean(document.createElement("canvas").getContext("webgl2")));
    } catch {
      setGl(false);
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (stage.current) io.observe(stage.current);
    return () => io.disconnect();
  }, []);

  // molette et glisser : GSAP Observer sur la scène seulement (la page reste défilable ailleurs)
  const step = useRef(0);
  useGSAP(
    () => {
      if (!stage.current) return;
      const obs = Observer.create({
        target: stage.current,
        type: "wheel,touch,pointer",
        wheelSpeed: -1,
        tolerance: 12,
        dragMinimum: 6,
        preventDefault: false,
        onWheel: (self) => self.event.preventDefault(),
        onChangeX: (self) => {
          step.current += self.deltaX;
          if (Math.abs(step.current) > 60) {
            go(Math.round(pos.current.v) + (step.current > 0 ? -1 : 1));
            step.current = 0;
          }
        },
        // la molette verticale fait défiler aussi ; au doigt, seul le geste horizontal compte (la page reste défilable)
        onUp: (self) => {
          if (self.event.type === "wheel") go(Math.round(pos.current.v) + 1);
        },
        onDown: (self) => {
          if (self.event.type === "wheel") go(Math.round(pos.current.v) - 1);
        },
      });
      return () => obs.kill();
    },
    { dependencies: [go], scope: stage },
  );

  const size = cur ? caseSize({ runtime: cur.film.runtime, mediaType: cur.film.mediaType, edition: cur.film.edition, caseType: cur.film.caseType }) : null;

  return (
    <section
      className="relative"
      aria-roledescription="carrousel"
      aria-label="Ma collection, boîtier par boîtier"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go(current + 1);
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(current - 1);
        }
      }}
    >
      <div ref={stage} className="relative h-[min(72svh,680px)] min-h-[440px] touch-pan-y overflow-hidden rounded-[var(--r-panel)] bg-[radial-gradient(70%_60%_at_50%_45%,#16161a,#000_75%)] shadow-[0_0_0_1px_var(--line)]">
        {gl && (
          <Canvas shadows frameloop={visible ? "always" : "never"} dpr={[1, 1.6]} camera={{ fov: 26, position: [0, 0.35, 7.2] }} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.02 }}>
            <Suspense fallback={null}>
              <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.85} />
              <directionalLight position={[-3, 4, 4]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
              {rows.map((r, i) =>
                Math.abs(i - current) <= WINDOW ? <ParadeCase key={`${r.film.id}-${i}`} row={r} index={i} pos={pos} isCurrent={i === current} onPick={(j) => (j === current ? null : go(j))} /> : null,
              )}
              <CamFit />
              <ContactShadows position={[0, -1.0, 0]} opacity={0.6} scale={16} blur={2.4} far={2.2} resolution={512} color="#000" />
            </Suspense>
          </Canvas>
        )}
        {gl === false && <p className="absolute inset-0 grid place-items-center text-muted">Cette vue n&apos;est pas disponible sur cet appareil.</p>}
      </div>

      {/* le boîtier du moment, et la commande du défilé */}
      {cur && size && (
        <div className="mt-6 grid items-end gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div key={cur.film.id} className="dm-rise min-w-0" aria-live="polite">
            <h2 className="truncate text-[clamp(2rem,4vw,3.2rem)] leading-none">{cur.film.title}</h2>
            <p className="mt-2 text-[15px] text-[var(--text-2)]">
              {[cur.director, cur.film.year].filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn !size-11 !p-0" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Boîtier précédent">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button className="btn !size-11 !p-0" onClick={() => go(current + 1)} disabled={current === rows.length - 1} aria-label="Boîtier suivant">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <Link href={cur.film.href} className="btn btn-primary">
              Voir la fiche
            </Link>
            <Link href={`${cur.film.href}?personnaliser`} className="btn">
              Personnaliser
            </Link>
          </div>
          <label className="md:col-span-2">
            <span className="sr-only">Position dans la collection</span>
            <input type="range" className="range" min={0} max={rows.length - 1} value={current} onChange={(e) => go(Number(e.target.value))} style={{ "--fill": `${(current / Math.max(1, rows.length - 1)) * 100}%` } as React.CSSProperties} />
          </label>
        </div>
      )}
    </section>
  );
}
