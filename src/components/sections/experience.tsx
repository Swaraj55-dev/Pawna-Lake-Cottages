import { experience } from "@/config/site";
import { SectionHeading } from "./section-heading";
import { ExperienceTimeline } from "./experience-timeline";

export function Experience() {
  if (experience.length === 0) return null;
  return (
    <section
      id="experience"
      aria-labelledby="experience-title"
      className="relative scroll-mt-20 overflow-hidden bg-lake-deep py-20 md:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgb(242_166_90/0.18),transparent_60%)]"
      />
      <div className="container-page relative">
        <SectionHeading
          id="experience-title"
          eyebrow="Your stay"
          title="From golden hour to first light"
          align="center"
          tone="dark"
        />
        <ExperienceTimeline steps={experience} />
      </div>
    </section>
  );
}
