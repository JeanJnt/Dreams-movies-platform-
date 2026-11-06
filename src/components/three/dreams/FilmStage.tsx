"use client";

import { ContactShadows, Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CaseObject, useCaseAnim, type CaseFilmInfo } from "./CaseObject";

/*
 * La scène de la fiche film : le boîtier DVD du film, posé dans la lumière d'un studio.
 *   — on le fait tourner au doigt ou à la souris (inertie, puis retour doux vers la vue choisie) ;
 *   — trois vues : face, tranche, dos ;
 *   — « Ouvrir » : une timeline GSAP ouvre le couvercle, sort le disque, le pose à droite et le fait tourner ;
 *     « Ranger » rejoue la timeline à l'envers.
 * La boucle de rendu s'arrête quand la scène sort de l'écran. Sans WebGL : l'affiche, à plat.
 */
const VIEWS = { face: -0.38, tranche: Math.PI / 2 - 0.15, dos: Math.PI - 0.3 } as const;
export type View = keyof typeof VIEWS;

// La caméra : plus de recul quand le boîtier est ouvert, et sur écran étroit
function Rig({ open }: { open: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  useFrame((_, dt) => {
    const narrow = size.width / size.height < 0.9;
    const z = (narrow ? 5.8 : 4.7) + open.current * (narrow ? 5.8 : 4.2);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, z, 3, dt);
    camera.lookAt(0, 0.02, 0);
  });
  return null;
}

// focus : la vue imposée de l'extérieur (l'éditeur montre la face, le dos ou la tranche qu'on modifie) ; controls : les boutons de vue
export function FilmStage({ film, className = "", focus, controls = true }: { film: CaseFilmInfo; className?: string; focus?: View; controls?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const anim = useCaseAnim();
  const yaw = useRef({ v: VIEWS.face, vel: 0, target: VIEWS.face as number | null });
  const openRef = useRef(0);
  const [, setView] = useState<View | null>("face");
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [gl, setGl] = useState<boolean | null>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    try {
      setGl(Boolean(document.createElement("canvas").getContext("webgl2")));
    } catch {
      setGl(false);
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  // La timeline d'ouverture : couvercle → disque qui sort → rotation
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = gsap.timeline({ paused: true });
    t.to(anim.current, { open: 1, duration: calm ? 0 : 0.9, ease: "power3.inOut" }, 0)
      .to(openRef, { current: 1, duration: calm ? 0 : 0.9, ease: "power3.inOut" }, 0)
      .to(anim.current, { out: 1, duration: calm ? 0 : 1.1, ease: "power2.inOut" }, calm ? 0 : 0.55)
      .to(anim.current, { spin: calm ? 0 : 0.45, duration: 1.2, ease: "power2.out" }, calm ? 0 : 1.2);
    tl.current = t;
    return () => {
      t.kill();
    };
  }, [anim]);

  const choose = (v: View) => {
    setView(v);
    if (open) toggle(false);
    yaw.current.vel = 0;
    yaw.current.target = VIEWS[v] + Math.round((yaw.current.v - VIEWS[v]) / (Math.PI * 2)) * Math.PI * 2;
  };
  useEffect(() => {
    if (focus) choose(focus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  const toggle = (next = !open) => {
    setOpen(next);
    if (next) {
      setView(null);
      yaw.current.target = -0.12 + Math.round(yaw.current.v / (Math.PI * 2)) * Math.PI * 2;
      tl.current?.timeScale(1).play();
    } else tl.current?.timeScale(1.6).reverse();
  };

  // glisser pour tourner (inertie)
  const drag = useRef<{ x: number; t: number; moved: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, t: performance.now(), moved: 0 };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const now = performance.now(), dx = e.clientX - drag.current.x;
    if (Math.abs(dx) < 1) return;
    drag.current.moved += Math.abs(dx);
    yaw.current.target = null;
    yaw.current.v += dx * 0.012;
    yaw.current.vel = (dx * 0.012) / (Math.max(8, now - drag.current.t) / 1000);
    drag.current = { x: e.clientX, t: now, moved: drag.current.moved };
    setView(null);
  };
  // un simple toucher (sans glisser) ouvre le boîtier et sort le disque ; un autre le range
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && d.moved < 6 && controls) toggle();
  };

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <div className="absolute inset-0 cursor-pointer touch-pan-y active:cursor-grabbing" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} role="img" aria-label={`Boîtier de ${film.title}. Glissez pour le tourner, touchez pour l'ouvrir.`}>
        {gl && (
          <Canvas
            shadows
            frameloop={visible ? "always" : "never"}
            dpr={[1, 1.8]}
            camera={{ fov: 24, position: [0, 0.05, 4.6], near: 0.1, far: 50 }}
            gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.02 }}
          >
            <Suspense fallback={null}>
              <Environment files="/hdri/studio_small_09_1k.hdr" environmentIntensity={0.9} />
              <directionalLight position={[-2.5, 4, 3.5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
              <directionalLight position={[3, 1, -2]} intensity={0.6} color="#c9d4ff" />
              <Turntable yaw={yaw} open={openRef}>
                <group scale={10}>
                  <CaseObject film={film} anim={anim} />
                </group>
              </Turntable>
              <ContactShadows position={[0, -1.02, 0]} opacity={0.55} scale={7} blur={2.6} far={2} resolution={512} color="#000" />
            </Suspense>
            <Rig open={openRef} />
          </Canvas>
        )}
        {gl === false && film.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/img?s=w500&p=${encodeURIComponent(film.poster)}`} alt="" className="poster absolute top-1/2 left-1/2 w-[52%] -translate-x-1/2 -translate-y-1/2" />
        )}
      </div>
    </div>
  );
}

// Le support tournant : la rotation (yaw) et le décalage d'ouverture, appliqués au boîtier
function Turntable({ yaw, open, children }: { yaw: React.MutableRefObject<{ v: number; vel: number; target: number | null }>; open: React.MutableRefObject<number>; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    const y = yaw.current;
    if (y.target != null) y.v = THREE.MathUtils.damp(y.v, y.target, 5, dt);
    else {
      y.v += y.vel * dt;
      y.vel *= Math.pow(0.05, dt);
      if (Math.abs(y.vel) < 0.02) y.target = y.v;
    }
    if (!g.current) return;
    g.current.rotation.y = y.v + s.pointer.x * 0.06;
    g.current.rotation.x = THREE.MathUtils.damp(g.current.rotation.x, -s.pointer.y * 0.04, 4, dt);
    g.current.position.x = THREE.MathUtils.damp(g.current.position.x, open.current * 0.05, 4, dt);
  });
  return <group ref={g}>{children}</group>;
}
