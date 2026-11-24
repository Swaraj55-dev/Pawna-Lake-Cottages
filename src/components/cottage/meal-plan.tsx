import { Clock, Sailboat, UtensilsCrossed } from "lucide-react";
import { formatINR, fromPrice } from "@/lib/format";
import type { Cottage } from "@/config/site";

export function CottageMealPlan({ cottage }: { cottage: Cottage }) {
  if (!cottage.mealPlan) return null;

  const rate = fromPrice(cottage);

  return (
    <section aria-labelledby="meal-plan-title" className="border-t border-ink/10 py-10">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-lake-deep via-lake to-forest p-6 text-sand shadow-[0_24px_60px_-30px_rgb(14_59_67/0.55)] md:p-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sunset">Aroma Cottage · for two</p>
            <h2 id="meal-plan-title" className="mt-3 max-w-xl font-heading text-3xl md:text-4xl">
              Meals, kayaking & a lakeside stay — together
            </h2>
            <p className="mt-3 max-w-2xl text-sand/80">
              One clear per-person rate includes your stay, the meal plan below, and kayaking on Pawna Lake.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                <UtensilsCrossed className="size-4 text-sunset" aria-hidden /> All listed meals
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                <Sailboat className="size-4 text-sunset" aria-hidden /> Kayaking included
              </span>
            </div>
          </div>
          <div className="min-w-52 rounded-2xl bg-sunset p-5 text-ink shadow-lg">
            <p className="text-sm font-semibold">Per person / night</p>
            <p className="mt-1 font-heading text-4xl">{rate !== null ? formatINR(rate) : "Price on request"}</p>
            <p className="mt-1 text-sm">Stay + meals + kayaking</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {cottage.mealPlan.map((meal) => (
          <article key={meal.title} className="rounded-2xl bg-card p-5 ring-1 ring-ink/5">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sunset-deep">{meal.time}</p>
                <h3 className="mt-2 font-heading text-2xl">{meal.title}</h3>
              </div>
              <Clock className="mt-1 size-5 shrink-0 text-lake" aria-hidden />
            </header>

            {meal.shared && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Served to all guests</p>
                <p className="mt-1 font-medium">{meal.shared.join(" · ")}</p>
              </div>
            )}
            {meal.vegetarian && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-lake">Vegetarian</p>
                <p className="mt-1 font-medium">{meal.vegetarian.join(" · ")}</p>
              </div>
            )}
            {meal.nonVegetarian && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-sunset-deep">Non-vegetarian</p>
                <p className="mt-1 font-medium">{meal.nonVegetarian.join(" · ")}</p>
              </div>
            )}
            {meal.note && <p className="mt-4 text-sm text-muted-foreground">{meal.note}</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
