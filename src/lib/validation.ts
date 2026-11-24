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

export const stayRequestSchema = z
  .object({
    type: cottageSlugSchema,
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.number().int().min(1).max(60),
    cottages: z.number().int().min(1).max(20),
  })
  .refine((v) => v.checkOut > v.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

export type StayRequest = z.infer<typeof stayRequestSchema>;

/** Indian mobile: optional +91 / 0 prefix, then 10 digits starting 6–9. Returns the 10 digits. */
export const indianPhoneSchema = z
  .string()
  .transform((s) => s.replace(/[\s()-]/g, ""))
  .refine((s) => /^(?:\+?91|0)?[6-9]\d{9}$/.test(s), { message: "Enter a valid 10-digit Indian mobile number" })
  .transform((s) => s.slice(-10));
