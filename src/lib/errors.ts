import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { PricingError } from "./pricing";

/** An error that is safe to show to the visitor, with an HTTP status. */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotConfiguredError extends AppError {
  constructor(service: string) {
    super("NOT_CONFIGURED", `${service} is not configured yet. Please book on WhatsApp or call us.`, 503);
  }
}

export const noStore = { "Cache-Control": "no-store" } as const;

/** Converts any thrown error into a JSON response without leaking internals. */
export function errorResponse(e: unknown) {
  // Let Next.js internal control-flow errors (prerender bail-out, redirect,
  // notFound) propagate instead of turning them into a 500.
  unstable_rethrow(e);
  const init = (status: number) => ({ status, headers: noStore });
  if (e instanceof AppError) {
    return NextResponse.json({ error: e.code, message: e.message }, init(e.status));
  }
  if (e instanceof PricingError) {
    return NextResponse.json({ error: e.code, message: e.message }, init(400));
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Please check the details and try again.",
        issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      init(400),
    );
  }
  console.error("[api] unexpected error", e);
  return NextResponse.json(
    { error: "SERVER_ERROR", message: "Something went wrong. Please try again or contact us on WhatsApp." },
    init(500),
  );
}
