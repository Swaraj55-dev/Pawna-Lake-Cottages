"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import type { ReactNode } from "react";

/**
 * 3D tilt-on-hover with a moving glare and a cursor-follow glow.
 * Mouse only: touch devices and reduced-motion users get a flat card.
 */
export function TiltCard({
  children,
  className,
  max = 7,
}: {
  children: ReactNode;
  className?: string;
  /** max tilt in degrees */
  max?: number;
}) {
  const reduce = useReducedMotion();
  // pointer position within the card, 0..1
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const spring = { stiffness: 180, damping: 18, mass: 0.5 };
  const rotX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const glareOpacity = useSpring(hover, { stiffness: 200, damping: 25 });

  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgb(255 255 255 / 0.35), transparent 45%)`;
  const glow = useMotionTemplate`radial-gradient(600px circle at ${gx} ${gy}, rgb(242 166 90 / 0.35), transparent 40%)`;

  // Same markup with or without reduced motion (avoids hydration mismatch);
  // reduced motion simply never feeds pointer values in.
  return (
    <div className={className} style={{ perspective: 1100 }}>
      <motion.div
        className="relative h-full"
        style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
          hover.set(1);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
          hover.set(0);
        }}
      >
        {/* cursor-follow glow behind the card */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-px -z-10 rounded-[calc(1.5rem+1px)] blur-xl"
          style={{ background: glow, opacity: glareOpacity }}
        />
        {children}
        {/* glare on top */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-3xl mix-blend-soft-light"
          style={{ background: glare, opacity: glareOpacity }}
        />
      </motion.div>
    </div>
  );
}
