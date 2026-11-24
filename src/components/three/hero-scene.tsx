"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// three.js + R3F live in their own chunk, fetched only on capable devices.
const LakeScene = dynamic(() => import("./lake-scene"), { ssr: false });

/** Should this device get the live 3D scene, or stay on the static poster? */
function canRender3D() {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(min-width: 768px)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  if (nav.connection?.saveData) return false;
  if ((nav.hardwareConcurrency ?? 4) < 4) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  try {
    const c = document.createElement("canvas");
    if (!c.getContext("webgl2")) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Layered over the hero poster. The poster is always server-rendered (fast LCP);
 * the canvas mounts after the browser is idle and cross-fades in once its first
 * frame is drawn. Rendering pauses when the hero scrolls out of view, and the
 * scene unmounts (back to poster) if the frame rate can't keep up.
 */
export function HeroScene() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!canRender3D()) return;
    const start = () => setEnabled(true);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(start, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(start, 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "absolute inset-0 -z-20 transition-opacity duration-[1400ms] ease-out",
        ready ? "opacity-100" : "opacity-0",
      )}
    >
      {enabled && (
        <LakeScene
          active={visible}
          onReady={() => setReady(true)}
          onFallback={() => {
            setReady(false);
            setTimeout(() => setEnabled(false), 1400);
          }}
        />
      )}
    </div>
  );
}
