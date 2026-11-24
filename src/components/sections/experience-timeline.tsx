"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  Coffee,
  KeyRound,
  LogOut,
  Sparkles,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  arrival: KeyRound,
  lakeside: Waves,
  dining: UtensilsCrossed,
  evening: Sparkles,
  morning: Coffee,
  departure: LogOut,
};

type Step = { key: string; title: string; description: string };

export function ExperienceTimeline({ steps }: { steps: Step[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string | null>(steps[0]?.key ?? null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-5xl">
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[25px] top-2 z-0 w-0.5 bg-sand/15 md:left-1/2 md:-translate-x-1/2"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[25px] top-2 z-0 w-1 -translate-x-[1px] bg-sunset/20 blur-[5px] md:left-1/2 md:-translate-x-1/2"
      />
      <motion.span
        aria-hidden
        className="pointer-events-none absolute bottom-2 left-[25px] top-2 z-0 w-0.5 origin-top bg-gradient-to-b from-sunset via-sunset to-sunset/60 shadow-[0_0_12px_3px_rgb(242_166_90/0.55)] md:left-1/2 md:-translate-x-1/2"
        style={{ scaleY: reduce ? 1 : progress }}
      />
      {steps.map((s, i) => {
        const Icon = icons[s.key] ?? Sparkles;
        const right = i % 2 === 1;
        const isActive = active === s.key;
        return (
          <motion.li
            key={s.key}
            className="relative z-10 grid grid-cols-[3rem_1fr] gap-4 pb-10 last:pb-0 md:grid-cols-[1fr_4rem_1fr] md:gap-8"
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
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => setActive(s.key)}
                className={cn(
                  "group w-full rounded-2xl border border-sand/10 bg-sand/[0.035] p-4 text-left shadow-[0_10px_35px_-25px_rgb(0_0_0/0.8)] transition-all duration-300 hover:border-sunset/35 hover:bg-sand/[0.07] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset md:max-w-md",
                  !right && "md:ml-auto",
                  right && "md:mr-auto",
                  !right && "md:text-right",
                  isActive && "border-sunset/40 bg-sand/[0.07] shadow-[0_0_28px_-18px_rgb(242_166_90/0.75)]",
                )}
              >
                <span className="mb-1 block text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-sunset/85">
                  Moment {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "block font-heading text-2xl text-sand transition-all duration-300 md:text-3xl",
                    isActive
                      ? "drop-shadow-[0_0_12px_rgb(242_166_90/0.45)]"
                      : "drop-shadow-[0_0_7px_rgb(242_166_90/0.2)] group-hover:drop-shadow-[0_0_12px_rgb(242_166_90/0.4)]",
                  )}
                >
                  {s.title}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-sand/75 md:text-base">
                  {s.description}
                </span>
              </button>
            </div>
            <div className="col-start-1 row-start-1 flex justify-center md:col-start-2">
              <span
                className={cn(
                  "relative z-20 inline-flex size-14 items-center justify-center rounded-full border bg-lake-deep text-sunset transition-all duration-300",
                  isActive
                    ? "scale-110 border-sunset shadow-[0_0_0_5px_rgb(242_166_90/0.12),0_0_28px_2px_rgb(242_166_90/0.65)]"
                    : "border-sunset/50 bg-lake-deep shadow-[0_0_0_3px_rgb(242_166_90/0.07),0_0_20px_rgb(242_166_90/0.38)]",
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
            </div>
            {i === steps.length - 1 && (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-0 left-[11px] top-14 z-10 w-7 bg-lake-deep md:left-1/2 md:-translate-x-1/2"
              />
            )}
          </motion.li>
        );
      })}
    </ol>
  );
}
