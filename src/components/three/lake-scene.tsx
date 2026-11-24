"use client";

/**
 * Procedural low-poly Pawna Lake at dusk - no GLB/texture downloads.
 * Sky dome shader, shader water with sun streak, low-poly hills,
 * A-frame cottage with glowing window, firefly particles, pointer/tilt parallax.
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";

const SUN = new THREE.Vector3(-7, 2.4, -45);
const SUN_DIR = SUN.clone().normalize();
const HORIZON = new THREE.Color("#b86f52");
const COTTAGE_POS = new THREE.Vector3(5.2, 0, -6.5);

// Deterministic RNG so the scene looks the same every load.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Ref for a ShaderMaterial whose `uTime` uniform tracks the R3F clock. */
function useShaderTime() {
  const ref = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return ref;
}

/* ---------------------------------- Sky ---------------------------------- */

function Sky() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: new THREE.Color("#0a2a30") },
      uMid: { value: new THREE.Color("#24384a") },
      uHorizon: { value: HORIZON },
      uSunColor: { value: new THREE.Color("#f2a65a") },
      uSunDir: { value: SUN_DIR },
    }),
    [],
  );
  const mat = useShaderTime();
  return (
    <mesh scale={90}>
      <sphereGeometry args={[1, 32, 16]} />
      <shaderMaterial
        ref={mat}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform vec3 uTop, uMid, uHorizon, uSunColor, uSunDir;
          varying vec3 vDir;
          float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y;
            vec3 col = mix(uHorizon, uMid, smoothstep(-0.01, 0.12, h));
            col = mix(col, uTop, smoothstep(0.08, 0.45, h));
            float s = max(dot(d, normalize(uSunDir)), 0.0);
            float low = 1.0 - smoothstep(0.0, 0.3, h);
            col += uSunColor * (pow(s, 6.0) * 0.28 * low + pow(s, 80.0) * 0.5);
            col = mix(col, uSunColor * 1.4, smoothstep(0.9992, 0.9996, s)); // sun disc
            // faint twinkling stars high up
            vec3 cell = floor(d * 260.0);
            float star = step(0.9975, hash(cell)) * smoothstep(0.28, 0.7, h);
            col += star * (0.5 + 0.5 * sin(uTime * 2.0 + hash(cell) * 40.0)) * 0.8;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}

/* --------------------------------- Water --------------------------------- */

function Water() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color("#082228") },
      uFar: { value: new THREE.Color("#5b4a56") },
      uSun: { value: new THREE.Color("#f2a65a") },
      uSunDir: { value: SUN_DIR },
      uSunX: { value: SUN.x * 0.18 },
      uFog: { value: HORIZON },
    }),
    [],
  );
  const mat = useShaderTime();
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -20]}>
      <planeGeometry args={[140, 80, 160, 90]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime;
          varying vec3 vWorld;
          varying vec3 vNormal;
          void main() {
            vec3 p = position;
            float a = p.x * 0.55 + uTime * 0.8;
            float b = p.y * 0.9 - uTime * 0.6;
            float c = (p.x + p.y) * 1.7 + uTime * 1.3;
            p.z += sin(a) * 0.06 + sin(b) * 0.05 + sin(c) * 0.025;
            // analytic normal from the wave derivatives (smooth, no facets)
            float dx = cos(a) * 0.033 + cos(c) * 0.0425;
            float dy = cos(b) * 0.045 + cos(c) * 0.0425;
            vNormal = normalize(mat3(modelMatrix) * vec3(-dx, -dy, 1.0));
            vec4 world = modelMatrix * vec4(p, 1.0);
            vWorld = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }`}
        fragmentShader={/* glsl */ `
          uniform float uTime, uSunX;
          uniform vec3 uDeep, uFar, uSun, uSunDir, uFog;
          varying vec3 vWorld;
          varying vec3 vNormal;
          void main() {
            vec3 toCam = cameraPosition - vWorld;
            float dist = length(toCam);
            vec3 v = toCam / dist;
            vec3 n = normalize(vNormal);
            vec3 col = mix(uDeep, uFar, smoothstep(3.0, 50.0, dist));
            // sharp glints
            vec3 r = reflect(-v, n);
            float spec = pow(max(dot(r, normalize(uSunDir)), 0.0), 120.0);
            col += uSun * spec * 1.6;
            // broad shimmering reflection column under the sun
            float width = 0.6 + dist * 0.09;
            float streak = exp(-pow((vWorld.x - uSunX * dist * 0.2) / width, 2.0)) * smoothstep(4.0, 30.0, dist);
            float shimmer = 0.55 + 0.45 * sin(vWorld.z * 5.0 + uTime * 2.2 + sin(vWorld.x * 3.0));
            col += uSun * streak * shimmer * 0.35;
            col = mix(col, uFog, smoothstep(26.0, 60.0, dist));
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}

/* --------------------------------- Hills --------------------------------- */

function Hills() {
  const hills = useMemo(() => {
    const r = rng(42);
    const greens = ["#2f4f3a", "#26412f", "#1d3326", "#355a42"];
    return Array.from({ length: 34 }, (_, i) => {
      const row = i % 3;
      const z = -16 - row * 7 - r() * 4;
      return {
        pos: [(r() - 0.5) * 90, -0.2, z] as [number, number, number],
        scale: [5 + r() * 7 + row * 2, 2 + r() * 3.5 + row * 1.5, 4 + r() * 4] as [number, number, number],
        rot: r() * Math.PI,
        color: greens[Math.floor(r() * greens.length)],
      };
    });
  }, []);
  return (
    <group>
      {hills.map((h, i) => (
        <mesh key={i} position={h.pos} scale={h.scale} rotation-y={h.rot}>
          <coneGeometry args={[1, 1, 7, 1]} />
          <meshStandardMaterial color={h.color} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------- Cottage -------------------------------- */

function Glow({ size = 3, color = "#f2a65a", opacity = 0.55 }) {
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uTime: { value: 0 } }),
    [color, opacity],
  );
  const mat = useShaderTime();
  return (
    <Billboard>
      <mesh>
        <planeGeometry args={[size, size]} />
        <shaderMaterial
        ref={mat}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniforms}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`
            uniform vec3 uColor; uniform float uOpacity, uTime; varying vec2 vUv;
            void main(){
              float d = length(vUv - 0.5) * 2.0;
              float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2) * uOpacity * (0.92 + 0.08 * sin(uTime * 3.0));
              gl_FragColor = vec4(uColor * a, a);
            }`}
        />
      </mesh>
    </Billboard>
  );
}

function Cottage() {
  const roof = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.85, 0);
    s.lineTo(0, 1.35);
    s.lineTo(0.85, 0);
    s.lineTo(-0.85, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.8, bevelEnabled: false });
    g.translate(0, 0, -0.9);
    return g;
  }, []);
  const windowShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.28, 0);
    s.lineTo(0, 0.5);
    s.lineTo(0.28, 0);
    s.lineTo(-0.28, 0);
    return new THREE.ShapeGeometry(s);
  }, []);

  return (
    <group position={COTTAGE_POS} rotation-y={-0.45}>
      {/* little shore island */}
      <mesh position={[0, -0.12, 0]} scale={[2.6, 0.3, 2.1]}>
        <cylinderGeometry args={[1, 1.15, 1, 9]} />
        <meshStandardMaterial color="#1d3326" flatShading roughness={1} />
      </mesh>
      <mesh geometry={roof} position={[0, 0.03, 0]}>
        <meshStandardMaterial color="#14201f" roughness={0.9} flatShading />
      </mesh>
      <mesh geometry={windowShape} position={[0, 0.05, 0.91]}>
        <meshBasicMaterial color="#ffc27a" toneMapped={false} />
      </mesh>
      <group position={[0, 0.35, 1.1]}>
        <Glow size={3.2} opacity={0.6} />
      </group>
      <pointLight position={[0, 0.5, 1.4]} color="#f2a65a" intensity={6} distance={7} decay={1.6} />
      {/* a couple of pines */}
      {[
        [-1.6, 0, -0.6, 1.1],
        [-2.1, 0, 0.5, 0.8],
        [1.7, 0, -0.9, 1.3],
      ].map(([x, y, z, s], i) => (
        <mesh key={i} position={[x, y + 0.9 * s, z]} scale={[0.45 * s, 1.8 * s, 0.45 * s]}>
          <coneGeometry args={[1, 1, 6]} />
          <meshStandardMaterial color="#1a2e22" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------- Fireflies ------------------------------- */

function Fireflies({ count = 90 }) {
  const { gl } = useThree();
  const [positions, seeds] = useMemo(() => {
    const r = rng(7);
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3] = COTTAGE_POS.x + (r() - 0.5) * 14;
      p[i * 3 + 1] = 0.2 + r() * 2.4;
      p[i * 3 + 2] = COTTAGE_POS.z + (r() - 0.4) * 9;
      s[i] = r();
    }
    return [p, s];
  }, [count]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) } }),
    [gl],
  );
  const mat = useShaderTime();
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime, uPixelRatio;
          attribute float aSeed;
          varying float vFlicker;
          void main() {
            vec3 p = position;
            float t = uTime * (0.25 + aSeed * 0.35);
            p.x += sin(t + aSeed * 6.28) * 0.6;
            p.y += sin(t * 1.3 + aSeed * 12.0) * 0.3;
            p.z += cos(t * 0.9 + aSeed * 4.0) * 0.6;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (18.0 + aSeed * 22.0) * uPixelRatio / -mv.z;
            vFlicker = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 30.0), 3.0);
          }`}
        fragmentShader={/* glsl */ `
          varying float vFlicker;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            a = pow(a, 2.0) * vFlicker;
            gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * a, a);
          }`}
      />
    </points>
  );
}

/* -------------------------------- Camera --------------------------------- */

function Parallax() {
  const tilt = useRef({ x: 0, y: 0, active: false });
  useEffect(() => {
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      tilt.current = {
        x: THREE.MathUtils.clamp(e.gamma / 30, -1, 1),
        y: THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1),
        active: true,
      };
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 1.1, -12), []);
  useFrame((state, dt) => {
    const src = tilt.current.active ? tilt.current : state.pointer;
    target.set(src.x * 0.9, 1.7 + src.y * 0.35, 8);
    state.camera.position.lerp(target, 1 - Math.exp(-dt * 2.5));
    state.camera.lookAt(look);
  });
  return null;
}

/** Calls onReady after the first rendered frame (used to fade the canvas in). */
function FirstFrame({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      requestAnimationFrame(onReady);
    }
  });
  return null;
}

export default function LakeScene({
  active,
  onReady,
  onFallback,
}: {
  /** false pauses rendering (hero off-screen) */
  active: boolean;
  onReady: () => void;
  /** called if the device can't keep a decent frame rate */
  onFallback: () => void;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.7, 8], fov: 42, near: 0.1, far: 200 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      flat
      aria-hidden
    >
      <PerformanceMonitor onFallback={onFallback} flipflops={2} />
      <fog attach="fog" args={[HORIZON, 26, 80]} />
      <ambientLight intensity={0.25} color="#6d8a9a" />
      <directionalLight position={SUN.toArray()} intensity={1.1} color="#f2a65a" />
      <hemisphereLight args={["#3d5a5c", "#0a2a30", 0.5]} />
      <Sky />
      <Water />
      <Hills />
      <Cottage />
      <Fireflies />
      <Parallax />
      <FirstFrame onReady={onReady} />
    </Canvas>
  );
}
