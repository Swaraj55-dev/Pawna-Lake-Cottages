import { describe, expect, it } from "vitest";
import { contactSchema, guestDetailsSchemaForGuests, guestReviewSchema, stayRequestSchema } from "./validation";

const contact = {
  name: "Test Guest",
  phone: "9876543210",
  message: "I would like to know about a booking.",
};

describe("contactSchema", () => {
  it("requires a phone number and accepts an empty optional email", () => {
    const result = contactSchema.safeParse({ ...contact, email: "" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBeUndefined();
  });

  it("rejects a missing phone number", () => {
    const withoutPhone = { name: contact.name, message: contact.message };

    expect(contactSchema.safeParse(withoutPhone).success).toBe(false);
  });

  it("validates an email address when one is provided", () => {
    expect(contactSchema.safeParse({ ...contact, email: "not-an-email" }).success).toBe(false);
    expect(contactSchema.safeParse({ ...contact, email: "guest@example.com" }).success).toBe(true);
  });
});

describe("guest party and dietary validation", () => {
  const stay = {
    type: "aroma",
    checkIn: "2026-12-03",
    checkOut: "2026-12-04",
    guests: 5,
    cottages: 2,
    party: { adults: 3, childrenHalf: 2, childrenFree: 0 },
  };

  it("accepts a party breakdown matching the guest count with an adult per cottage", () => {
    expect(stayRequestSchema.safeParse(stay).success).toBe(true);
  });

  it("rejects mismatched counts and a cottage without an adult", () => {
    expect(stayRequestSchema.safeParse({ ...stay, party: { ...stay.party, childrenHalf: 1 } }).success).toBe(false);
    expect(stayRequestSchema.safeParse({ ...stay, party: { ...stay.party, adults: 1, childrenHalf: 4 } }).success).toBe(false);
  });

  it("requires the Veg, Non-veg, and Jain counts to match the party size", () => {
    const details = {
      name: "Test Guest",
      phone: "9876543210",
      email: "guest@example.com",
      foodCounts: { veg: 3, nonVeg: 2, jain: 0 },
      agree: true,
    };
    expect(guestDetailsSchemaForGuests(5).safeParse(details).success).toBe(true);
    expect(guestDetailsSchemaForGuests(5).safeParse({
      ...details,
      foodCounts: { veg: 3, nonVeg: 1, jain: 0 },
    }).success).toBe(false);
  });
});

describe("guestReviewSchema", () => {
  const review = {
    name: "Test Guest",
    cottage: "aroma",
    rating: 5,
    review: "Loved it!",
    website: "",
  };

  it("accepts a valid review for moderation", () => {
    expect(guestReviewSchema.safeParse(review).success).toBe(true);
  });

  it("accepts reviews up to 60 characters but rejects empty or longer reviews", () => {
    expect(guestReviewSchema.safeParse({ ...review, review: "Loved it!" }).success).toBe(true);
    expect(guestReviewSchema.safeParse({ ...review, review: "   " }).success).toBe(false);
    expect(guestReviewSchema.safeParse({ ...review, rating: 6 }).success).toBe(false);
    expect(guestReviewSchema.safeParse({ ...review, review: "a".repeat(60) }).success).toBe(true);
    expect(guestReviewSchema.safeParse({ ...review, review: "a".repeat(61) }).success).toBe(false);
    expect(guestReviewSchema.safeParse({ ...review, website: "spam" }).success).toBe(false);
  });
});
