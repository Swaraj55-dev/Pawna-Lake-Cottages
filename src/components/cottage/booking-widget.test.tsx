import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getCottage } from "@/config/site";
import { BookingWidget } from "./booking-widget";

describe("BookingWidget advance percentage", () => {
  it("uses each cottage's own booking advance", () => {
    const aroma = getCottage("aroma");
    const bella = getCottage("bella");
    if (!aroma || !bella) throw new Error("Cottage config is missing");

    expect(renderToStaticMarkup(<BookingWidget c={aroma} />)).toContain("Pay 30% now to confirm");
    expect(renderToStaticMarkup(<BookingWidget c={bella} />)).toContain("Pay 50% now to confirm");
  });
});
