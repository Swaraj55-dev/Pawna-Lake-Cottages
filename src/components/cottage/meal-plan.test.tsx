import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCottage } from "@/config/site";
import { CottageMealPlan } from "./meal-plan";

describe("CottageMealPlan", () => {
  it("shows Aroma's package price, kayaking, schedule and dietary choices", () => {
    const aroma = getCottage("aroma");
    if (!aroma) throw new Error("Aroma cottage config is missing");

    const html = renderToStaticMarkup(<CottageMealPlan cottage={aroma} />);

    for (const text of [
      "₹1,299",
      "Kayaking included",
      "Misal pav",
      "Fried paneer",
      "Fried chicken",
      "Mutter paneer",
      "Chicken curry",
      "Desserts",
      "Poha",
      "Saturday evenings feature live music with a singer.",
      "5:30 PM - 6:00 PM",
    ]) {
      expect(html).toContain(text);
    }
  });

  it("does not show the Aroma meal plan on Bella's cottage page", () => {
    const bella = getCottage("bella");
    if (!bella) throw new Error("Bella cottage config is missing");

    expect(renderToStaticMarkup(<CottageMealPlan cottage={bella} />)).toBe("");
  });
});
