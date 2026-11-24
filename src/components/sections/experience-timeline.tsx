"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  Coffee,
  Croissant,
  Flame,
  KeyRound,
  LogOut,
  Sailboat,
  Sparkles,
  Star,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  checkin: KeyRound,
  tea: Coffee,
  boating: Sailboat,
  bbq: Flame,
  dinner: UtensilsCrossed,
  stars: Star,
  breakfast: Croissant,
  checkout: LogOut,
};

type Step = { key: string; title: string; time?: string; desc: string };

export function ExperienceTimeline({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-4xl">
      {/* Track + animated fill */}
      <span aria-hidden className="absolute bottom-0 left-6 top-0 w-px bg-sand/15 md:left-1/2" />
      <motion.span
        aria-hidden
        className="absolute bottom-0 left-6 top-0 w-px origin-top bg-gradient-to-b from-sunset via-sunset to-sunset/40 md:left-1/2"
        style={{ scaleY: reduce ? 1 : progress }}
      />
      {steps.map((s, i) => {
        const Icon = icons[s.key] ?? Sparkles;
        const right = i % 2 === 1;
        return (
          <motion.li
            key={s.key}
            className="relative grid grid-cols-[3rem_1fr] gap-4 pb-12 last:pb-0 md:grid-cols-[1fr_3rem_1fr] md:gap-8"
            initial={reduce ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -15% 0px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className={cn(
                "col-start-2 row-start-1 md:col-start-1",
                right ? "md:col-start-3" : "md:text-right",
              )}
            >
              {s.time && (
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sunset">{s.time}</p>
              )}
              <h3 className="mt-1 text-2xl text-sand md:text-3xl">{s.title}</h3>
              <p className="mt-2 text-sand/75">{s.desc}</p>
            </div>
            <div className="col-start-1 row-start-1 flex justify-center md:col-start-2">
              <span className="relative z-10 inline-flex size-12 items-center justify-center rounded-full border border-sunset/50 bg-lake-deep text-sunset shadow-[0_0_30px_-4px_rgb(242_166_90/0.6)]">
                <Icon className="size-5" aria-hidden />
              </span>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
