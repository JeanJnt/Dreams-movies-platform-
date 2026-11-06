"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { BRAND_PATH } from "@/lib/brand-path";

/*
 * Le logo de Dreams en volume : le tracé d'origine (étoile entre deux croissants) extrudé,
 * arêtes biseautées, en argent poli. Il tourne sur lui-même ; deux lumières tournent en sens inverse,
 * si bien que les reflets glissent sur le métal pendant la rotation.
 * Aucun fichier à télécharger : l'environnement lumineux est construit sur place (Lightformers).
 */
let cached: THREE.ExtrudeGeometry | null = null;
function logoGeometry() {
  if (cached) return cached;
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1658 966"><path d="${BRAND_PATH}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const g = new THREE.ExtrudeGeometry(shapes, { depth: 70, bevelEnabled: true, bevelThickness: 16, bevelSize: 9, bevelSegments: 6, curveSegments: 24 });
  g.center();
  g.scale(1 / 1658, -1 / 1658, 1 / 1658); // le SVG a l'axe y vers le bas
  g.computeVertexNormals();
  cached = g;
  return g;
}

function Mark({ spin }: { spin: boolean }) {
  const g = useRef<THREE.Group>(null);
  const l1 = useRef<THREE.PointLight>(null);
  const l2 = useRef<THREE.PointLight>(null);
  const geometry = useMemo(logoGeometry, []);
  const material = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#dfe2e8", metalness: 1, roughness: 0.16, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1.25 }), []);
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (g.current && spin) {
      g.current.rotation.y += dt * 1.15;
      g.current.rotation.x = Math.sin(t * 0.8) * 0.12;
    }
    if (l1.current) l1.current.position.set(Math.cos(-t * 1.3) * 1.4, 0.6, Math.sin(-t * 1.3) * 1.4);
    if (l2.current) l2.current.position.set(Math.cos(t * 0.9 + 2) * 1.4, -0.5, Math.sin(t * 0.9 + 2) * 1.4);
  });
  return (
    <>
      <pointLight ref={l1} intensity={6} color="#ffffff" distance={4} />
      <pointLight ref={l2} intensity={3} color="#cfd8ff" distance={4} />
      <group ref={g}>
        <mesh geometry={geometry} material={material} />
      </group>
    </>
  );
}

export function Logo3D({ spin = true }: { spin?: boolean }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 30, position: [0, 0, 2.1] }} gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }} style={{ pointerEvents: "none" }}>
      <ambientLight intensity={0.15} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} position={[0, 2, 2]} scale={[4, 0.6, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-2.5, 0, 1]} rotation-y={Math.PI / 2} scale={[0.5, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[2.5, -0.5, 1]} rotation-y={-Math.PI / 2} scale={[0.4, 3, 1]} color="#dfe6ff" />
        <Lightformer form="circle" intensity={0.8} position={[0, -2, -1]} scale={2} />
      </Environment>
      <Mark spin={spin} />
    </Canvas>
  );
}
