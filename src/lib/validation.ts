import { z } from "zod";
import { cottages, type CottageSlug } from "@/config/site";
import { isISODate } from "./dates";

export const cottageSlugSchema = z.enum(cottages.map((c) => c.slug) as [CottageSlug, ...CottageSlug[]], {
  message: "Choose Aroma or Bella",
});

export const isoDateSchema = z.string().refine(isISODate, { message: "Invalid date" });

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM");

export const availabilityQuerySchema = z.object({
  type: cottageSlugSchema,
  month: monthSchema,
});

export const guestBreakdownSchema = z.object({
  adults: z.number().int().min(0).max(60),
  childrenHalf: z.number().int().min(0).max(60),
  childrenFree: z.number().int().min(0).max(60),
});

const stayRequestBaseSchema = z
  .object({
    type: cottageSlugSchema,
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.number().int().min(1).max(60),
    cottages: z.number().int().min(1).max(20),
    party: guestBreakdownSchema.optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] })
  .superRefine((v, ctx) => {
    const party = v.party ?? { adults: v.guests, childrenHalf: 0, childrenFree: 0 };
    if (party.adults + party.childrenHalf + party.childrenFree !== v.guests) {
      ctx.addIssue({
        code: "custom",
        message: "Adult and child counts must add up to the total guests.",
        path: ["party"],
      });
    }
    if (party.adults < v.cottages) {
      ctx.addIssue({
        code: "custom",
        message: "At least one adult (11+) is required per cottage.",
        path: ["party", "adults"],
      });
    }
  });

export const stayRequestSchema = stayRequestBaseSchema.transform((v) => ({
  ...v,
  party: v.party ?? { adults: v.guests, childrenHalf: 0, childrenFree: 0 },
}));

export type StayRequest = z.infer<typeof stayRequestSchema>;
export type GuestBreakdownInput = z.infer<typeof guestBreakdownSchema>;

/** Indian mobile: optional +91 / 0 prefix, then 10 digits starting 6–9. Returns the 10 digits. */
export const indianPhoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .refine((s) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(s), { message: "Enter a valid 10-digit Indian mobile number" })
  .transform((s) => s.slice(-10));

export const foodPrefSchema = z.enum(["veg", "non_veg", "jain"], { message: "Choose a food preference" });

export const foodCountsSchema = z.object({
  veg: z.number().int().min(0).max(60),
  nonVeg: z.number().int().min(0).max(60),
  jain: z.number().int().min(0).max(60),
});

export type FoodCounts = z.infer<typeof foodCountsSchema>;

export const guestDetailsSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120, "Name is too long"),
  phone: indianPhoneSchema,
  email: z.string().trim().pipe(z.email("Enter a valid email address")).pipe(z.string().max(200)),
  foodCounts: foodCountsSchema,
  notes: z.string().trim().max(1000, "Please keep requests under 1000 characters").optional().default(""),
  agree: z.literal(true, { message: "Please accept the cancellation policy to continue" }),
});

export function guestDetailsSchemaForGuests(guestCount: number) {
  return guestDetailsSchema.superRefine((values, ctx) => {
    const count = values.foodCounts.veg + values.foodCounts.nonVeg + values.foodCounts.jain;
    if (count !== guestCount) {
      ctx.addIssue({
        code: "custom",
        message: `Food preference counts must total ${guestCount} guests.`,
        path: ["foodCounts"],
      });
    }
  });
}

export type GuestDetailsInput = z.input<typeof guestDetailsSchema>;
export type GuestDetails = z.output<typeof guestDetailsSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z
    .string()
    .trim()
    .max(200)
    .transform((value) => value || undefined)
    .pipe(z.email("Enter a valid email address").optional())
    .optional(),
  phone: z.string().trim().min(7, "Please enter your phone number").max(20).regex(/^[+\d][\d\s-]{6,19}$/, {
    message: "Enter a valid phone number",
  }),
  message: z.string().trim().min(10, "Please write a little more (10+ characters)").max(4000, "Please keep it under 4000 characters"),
  /** Honeypot — real visitors never see or fill this. */
  website: z.string().max(0).optional().default(""),
});
export type ContactInput = z.input<typeof contactSchema>;

/** Body of POST /api/bookings — amounts are never accepted from the client. */
export const createBookingSchema = z.object({
  stay: stayRequestSchema,
  details: guestDetailsSchema,
  /** The caller's own previous hold to release when they change their stay (SEC-01). */
  replaceBookingId: z.uuid().optional(),
}).superRefine(({ stay, details }, ctx) => {
  const count = details.foodCounts.veg + details.foodCounts.nonVeg + details.foodCounts.jain;
  if (count !== stay.guests) {
    ctx.addIssue({
      code: "custom",
      message: `Food preference counts must total ${stay.guests} guests.`,
      path: ["details", "foodCounts"],
    });
  }
});

export const guestReviewSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80, "Name is too long"),
  cottage: cottageSlugSchema,
  rating: z.number().int().min(1).max(5),
  review: z.string().trim().min(1, "Please write a review").max(60, "Please keep your review to 60 characters or fewer"),
  /** Honeypot — real visitors never see or fill this. */
  website: z.string().max(0).optional().default(""),
});
export type GuestReviewInput = z.input<typeof guestReviewSchema>;
