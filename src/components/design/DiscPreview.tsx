"use client";

import { ContactShadows, Environment } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import type { CaseFilm } from "../three/cases/art";
import { DiscObject } from "../three/dreams/DiscObject";

// L'aperçu 3D du disque en cours de composition : le vrai disque (polycarbonate, miroir, diffraction), face à nous.
export default function DiscPreview({
  film,
  spin,
}: {
  film: CaseFilm;
  spin: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 22, position: [0, 0, 4.4] }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
    >
      <Suspense fallback={null}>
        <Environment
          files="/hdri/studio_small_09_1k.hdr"
          environmentIntensity={1}
        />
        <directionalLight position={[-2, 3, 3]} intensity={1.2} />
        <group scale={9}>
          <DiscObject film={film} cruise={spin ? 0.25 : 0} tilt />
        </group>
        <ContactShadows
          position={[0, -0.7, 0]}
          opacity={0.35}
          scale={4}
          blur={2.8}
          far={1.5}
          color="#000"
        />
      </Suspense>
    </Canvas>
  );
}
