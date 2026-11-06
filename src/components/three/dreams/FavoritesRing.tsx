"use client";

import { ContactShadows, Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CaseObject, useCaseAnim, type CaseFilmInfo } from "./CaseObject";

/*
 * Mes 10 films, en DVD : dix boîtiers posés en cercle sur un plateau qui tourne lentement autour d'un axe central.
 *   — le boîtier le plus proche est mis en avant : son titre s'affiche sous la scène ;
 *   — survol : le plateau ralentit ; glisser (souris ou doigt) : on le fait tourner, avec de l'inertie ;
 *   — toucher un boîtier ouvre la fiche du film ; un bouton met la rotation en pause ;
 *   — « réduire les animations » : le plateau ne tourne que si on le fait tourner.
 */
type Spin = {
  a: number;
  vel: number;
  cruise: number;
  hover: boolean;
  paused: boolean;
  goal: number | null;
};

function RingCase({
  film,
  index,
  n,
  radius,
  spin,
  onPick,
  onFront,
}: {
  film: CaseFilmInfo;
  index: number;
  n: number;
  radius: number;
  spin: React.MutableRefObject<Spin>;
  onPick: (href: string) => void;
  onFront: (i: number) => void;
}) {
  const g = useRef<THREE.Group>(null);
  const anim = useCaseAnim();
  const base = (index / n) * Math.PI * 2;
  useFrame(() => {
    const gr = g.current;
    if (!gr) return;
    const a = base + spin.current.a;
    gr.position.set(Math.sin(a) * radius, 0, Math.cos(a) * radius);
    gr.rotation.y = a - 0.22; // chaque boîtier regarde vers l'extérieur, un peu de biais pour montrer sa tranche
    // le boîtier de face (le plus proche) : celui dont l'angle est le plus près de 0
    const d = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(d) < Math.PI / n) onFront(index);
    // ceux du fond s'effacent un peu dans l'ombre
    const s = 1 + Math.max(0, Math.cos(a)) * 0.08;
    gr.scale.setScalar(s);
  });
  return (
    <group
      ref={g}
      onClick={(e) => {
        e.stopPropagation();
        onPick(film.href);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <group scale={10}>
        <CaseObject film={film} anim={anim} lite />
      </group>
    </group>
  );
}

function Plate({ spin }: { spin: React.MutableRefObject<Spin> }) {
  const { camera, size } = useThree();
  useFrame((_, dt) => {
    const s = spin.current;
    // vitesse : croisière (ralentie au survol, nulle en pause) + élan donné à la main, qui retombe
    const target = s.paused ? 0 : s.hover ? s.cruise * 0.25 : s.cruise;
    if (s.goal != null) {
      // les flèches : le plateau glisse jusqu'au boîtier voisin
      s.a = THREE.MathUtils.damp(s.a, s.goal, 5, dt);
      s.vel = 0;
      if (Math.abs(s.a - s.goal) < 0.002) s.goal = null;
    } else {
      s.vel = THREE.MathUtils.damp(s.vel, target, 1.6, dt);
      s.a += s.vel * dt;
    }
    const narrow = size.width / size.height < 1;
    const z = narrow ? 8.8 / Math.max(0.42, size.width / size.height) : 8.8;
    camera.position.set(
      0,
      narrow ? 2.4 : 1.9,
      THREE.MathUtils.damp(camera.position.z, z, 4, dt),
    );
    camera.lookAt(0, -0.15, 0);
  });
  return null;
}

export function FavoritesRing({ films }: { films: CaseFilmInfo[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gl, setGl] = useState<boolean | null>(null);
  const calm = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const spin = useRef<Spin>({
    a: 0,
    vel: 0,
    cruise: calm ? 0 : -0.16,
    hover: false,
    paused: false,
    goal: null,
  });
  const frontRef = useRef(0);
  const n = films.length;
  const radius = Math.max(2.6, n * 0.36);

  useEffect(() => {
    try {
      setGl(Boolean(document.createElement("canvas").getContext("webgl2")));
    } catch {
      setGl(false);
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "200px",
    });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    spin.current.paused = paused;
  }, [paused]);

  // glisser pour faire tourner le plateau ; un geste court sans mouvement reste un clic
  const drag = useRef<{ x: number; t: number; moved: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, t: performance.now(), moved: 0 };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now(),
      dx = e.clientX - d.x;
    d.moved += Math.abs(dx);
    const k = 0.006;
    spin.current.goal = null;
    spin.current.a += dx * k;
    spin.current.vel = (dx * k) / (Math.max(8, now - d.t) / 1000);
    d.x = e.clientX;
    d.t = now;
  };
  const onUp = () => setTimeout(() => (drag.current = null), 0);
  const pick = (href: string) => {
    if (drag.current && drag.current.moved > 8) return; // c'était un glissé
    router.push(href);
  };
  const onFront = (i: number) => {
    if (frontRef.current !== i) {
      frontRef.current = i;
      setFront(i);
    }
  };
  const step = (dir: number) => {
    const s = spin.current;
    const stepA = (Math.PI * 2) / n;
    // on part du boîtier de face, aligné, puis on va au voisin
    const from = s.goal ?? Math.round(s.a / stepA) * stepA;
    s.goal = from - dir * stepA;
  };

  const cur = films[front];
  return (
    <div ref={wrap}>
      <div
        className="relative h-[min(78svh,700px)] min-h-[420px] cursor-grab touch-pan-y active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerEnter={() => (spin.current.hover = true)}
        onPointerLeave={() => (spin.current.hover = false)}
        role="group"
        aria-label="Mes 10 films en DVD, en cercle. Glissez pour faire tourner, touchez un boîtier pour ouvrir sa fiche."
      >
        {gl && visible && (
          <Canvas
            shadows
            dpr={[1, 1.7]}
            camera={{ fov: 30, position: [0, 1.9, 9.6], near: 0.1, far: 60 }}
            gl={{
              antialias: true,
              alpha: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1,
            }}
          >
            <Suspense fallback={null}>
              <Environment
                files="/hdri/studio_small_09_1k.hdr"
                environmentIntensity={0.85}
              />
              <directionalLight
                position={[-3, 6, 5]}
                intensity={1.5}
                castShadow
                shadow-mapSize={[1024, 1024]}
              />
              <spotLight
                position={[0, 7, 6]}
                angle={0.5}
                penumbra={0.8}
                intensity={30}
                color="#ffffff"
              />
              <group position={[0, 0, -radius * 0.35]}>
                {films.map((f, i) => (
                  <RingCase
                    key={f.id}
                    film={f}
                    index={i}
                    n={n}
                    radius={radius}
                    spin={spin}
                    onPick={pick}
                    onFront={onFront}
                  />
                ))}
              </group>
              <ContactShadows
                position={[0, -1.0, -radius * 0.35]}
                opacity={0.6}
                scale={radius * 3.2}
                blur={2.4}
                far={2.2}
                resolution={512}
                color="#000"
              />
            </Suspense>
            <Plate spin={spin} />
          </Canvas>
        )}
        {gl === false && (
          <ul className="grid h-full grid-cols-5 place-content-center gap-3">
            {films.map((f) => (
              <li key={f.id}>
                <Link
                  href={f.href}
                  className="block text-[13px] hover:underline"
                >
                  {f.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0" aria-live="polite">
          {cur && (
            <Link href={cur.href} className="group block">
              <span className="block truncate font-display text-[1.6rem] leading-tight group-hover:text-accent md:text-[2rem]">
                {cur.design?.case?.front?.title || cur.title}
              </span>
              {cur.originalTitle && cur.originalTitle !== cur.title && (
                <span className="block truncate text-[13.5px] text-[var(--text-2)] italic">
                  {cur.originalTitle}
                </span>
              )}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-sm !px-3"
            onClick={() => step(-1)}
            aria-label="Boîtier précédent"
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
          >
            {paused ? "Reprendre la rotation" : "Mettre en pause"}
          </button>
          <button
            type="button"
            className="btn btn-sm !px-3"
            onClick={() => step(1)}
            aria-label="Boîtier suivant"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
