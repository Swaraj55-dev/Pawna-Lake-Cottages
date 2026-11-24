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

export const foodPrefSchema = z.enum(["veg", "non_veg", "jain"], { message: "Choose a food preference" });

export const guestDetailsSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120, "Name is too long"),
  phone: indianPhoneSchema,
  email: z.string().trim().pipe(z.email("Enter a valid email address")).pipe(z.string().max(200)),
  foodPref: foodPrefSchema,
  notes: z.string().trim().max(1000, "Please keep requests under 1000 characters").optional().default(""),
  agree: z.literal(true, { message: "Please accept the cancellation policy to continue" }),
});

export type GuestDetailsInput = z.input<typeof guestDetailsSchema>;
export type GuestDetails = z.output<typeof guestDetailsSchema>;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((s) => s === "" || /^[+\d][\d\s-]{6,19}$/.test(s), { message: "Enter a valid phone number" })
    .optional()
    .default(""),
  message: z.string().trim().min(10, "Please write a little more (10+ characters)").max(4000, "Please keep it under 4000 characters"),
  /** Honeypot — real visitors never see or fill this. */
  website: z.string().max(0).optional().default(""),
});
export type ContactInput = z.input<typeof contactSchema>;

/** Body of POST /api/bookings — amounts are never accepted from the client. */
export const createBookingSchema = z.object({
  stay: stayRequestSchema,
  details: guestDetailsSchema,
});
