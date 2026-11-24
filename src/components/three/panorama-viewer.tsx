"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useTexture } from "@react-three/drei";
import * as THREE from "three";

function PanoSphere({ src }: { src: string }) {
  const texture = useTexture(src, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });
  return (
    // scale x = -1 turns the sphere inside-out so the image faces the camera
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 64, 32]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

/** Drag-to-look 360° viewer for an equirectangular panorama (2:1 image). */
export default function PanoramaViewer({ src, autoRotate }: { src: string; autoRotate: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }} dpr={[1, 1.5]} flat>
      <Suspense fallback={null}>
        <PanoSphere src={src} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={-0.35}
        autoRotate={autoRotate}
        autoRotateSpeed={0.35}
        enableDamping
      />
    </Canvas>
  );
}
