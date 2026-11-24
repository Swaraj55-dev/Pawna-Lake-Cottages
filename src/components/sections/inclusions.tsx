import {
  Coffee,
  Croissant,
  Dices,
  Drumstick,
  Flame,
  Music,
  Sailboat,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { inclusions } from "@/config/site";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

const rules: [RegExp, LucideIcon][] = [
  [/tea|coffee|snack/i, Coffee],
  [/bbq|barbecue|grill/i, Drumstick],
  [/breakfast/i, Croissant],
  [/dinner|lunch|meal/i, UtensilsCrossed],
  [/boat|kayak/i, Sailboat],
  [/camp ?fire|bonfire/i, Flame],
  [/music|dj|guitar/i, Music],
  [/game/i, Dices],
];
const iconFor = (label: string) => rules.find(([re]) => re.test(label))?.[1] ?? Sparkles;

function Group({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-5 font-sans text-sm font-semibold uppercase tracking-[0.25em] text-forest">{title}</h3>
      <Stagger as="ul" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((label) => {
          const Icon = iconFor(label);
          return (
            <StaggerItem
              as="li"
              key={label}
              className="group flex flex-col items-start gap-4 rounded-2xl bg-card p-5 ring-1 ring-ink/5 transition-shadow hover:shadow-[0_16px_40px_-24px_rgb(14_59_67/0.5)]"
            >
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-lake text-sunset transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="font-medium">{label}</span>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}

export function Inclusions() {
  if (inclusions.meals.length === 0 && inclusions.activities.length === 0) return null;
  return (
    <section aria-labelledby="inclusions-title" className="py-20 md:py-28">
      <div className="container-page">
        <SectionHeading
          id="inclusions-title"
          eyebrow="Included"
          title="Everything that comes with your stay"
        />
        <div className="space-y-12">
          <Group title="Meals" items={inclusions.meals} />
          <Group title="Activities" items={inclusions.activities} />
        </div>
      </div>
    </section>
  );
}
