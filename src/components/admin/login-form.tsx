"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { sendMagicLink, type ActionState } from "@/app/admin/actions";

const ERRORS: Record<string, string> = {
  forbidden: "That account isn't allowed to access the admin. Sign in with an authorised email.",
  link_invalid: "That sign-in link has expired or was already used. Request a new one.",
  not_configured: "Supabase isn't configured yet — see the README.",
};

export function LoginForm() {
  const params = useSearchParams();
  const urlError = ERRORS[params.get("error") ?? ""];
  const [state, action, pending] = useActionState<ActionState, FormData>(sendMagicLink, { ok: false });

  if (state.ok) {
    return (
      <div role="status" className="space-y-3 text-center">
        <MailCheck className="mx-auto size-10 text-forest" aria-hidden />
        <p className="font-semibold">Check your email</p>
        <p className="text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      {(urlError || state.message) && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {state.message ?? urlError}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-semibold">
          Admin email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!state.fieldErrors?.email}
          aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          className="h-12 rounded-xl bg-card px-4 text-base"
        />
        {state.fieldErrors?.email && (
          <p id="email-error" className="text-sm font-medium text-destructive">
            {state.fieldErrors.email}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-lake font-semibold text-sand hover:bg-lake-deep disabled:opacity-60"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />} Email me a sign-in link
      </button>
    </form>
  );
}
