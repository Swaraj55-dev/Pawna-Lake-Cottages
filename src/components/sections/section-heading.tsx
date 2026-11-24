import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  id,
  align = "left",
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  id?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  return (
    <Reveal className={cn("mb-10 max-w-2xl md:mb-14", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p
          className={cn(
            "mb-3 text-xs font-semibold uppercase tracking-[0.3em]",
            tone === "dark" ? "text-sunset" : "text-sunset-deep",
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2 id={id} className={cn("text-4xl leading-tight md:text-5xl", tone === "dark" ? "text-sand" : "text-ink")}>
        {title}
      </h2>
      {intro && (
        <p className={cn("mt-4 text-lg", tone === "dark" ? "text-sand/80" : "text-muted-foreground")}>{intro}</p>
      )}
    </Reveal>
  );
}
