"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateBookingStatus } from "@/app/admin/actions";
import type { BookingStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const NEXT: Record<BookingStatus, { to: BookingStatus; label: string; tone: "primary" | "danger" | "neutral" }[]> = {
  pending_payment: [
    { to: "confirmed", label: "Confirm", tone: "primary" },
    { to: "cancelled", label: "Cancel", tone: "danger" },
  ],
  confirmed: [
    { to: "completed", label: "Complete", tone: "neutral" },
    { to: "cancelled", label: "Cancel", tone: "danger" },
  ],
  completed: [{ to: "confirmed", label: "Undo complete", tone: "neutral" }],
  cancelled: [{ to: "confirmed", label: "Re-activate", tone: "primary" }],
};

const HELP: Partial<Record<BookingStatus, string>> = {
  confirmed: "Use when payment was received another way (UPI to owner, cash). Availability is re-checked if the cottage is no longer held.",
  cancelled: "Frees the cottage for these dates. Refunds (if any) must be issued from the Razorpay dashboard.",
  completed: "Marks the stay as done (guest checked out, balance collected).",
};

export function StatusControl({ id, code, status }: { id: string; code: string; status: BookingStatus }) {
  const [target, setTarget] = useState<{ to: BookingStatus; label: string } | null>(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      if (!target) return;
      const r = await updateBookingStatus({ id, status: target.to, note: note || undefined });
      setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Updated." : "Failed.") });
      if (r.ok) {
        setTarget(null);
        setNote("");
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {NEXT[status].map((n) => (
        <button
          key={n.to}
          type="button"
          onClick={() => {
            setMsg(null);
            setTarget(n);
          }}
          className={cn(
            "inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold ring-1 transition-colors",
            n.tone === "primary" && "bg-lake text-sand ring-lake hover:bg-lake-deep",
            n.tone === "danger" && "text-destructive ring-destructive/30 hover:bg-destructive/10",
            n.tone === "neutral" && "ring-ink/15 hover:bg-muted",
          )}
        >
          {n.label}
        </button>
      ))}
      {msg && (
        <span role="status" className={cn("w-full text-xs font-medium", msg.ok ? "text-forest" : "text-destructive")}>
          {msg.text}
        </span>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && !pending && setTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {target?.label} {code}?
            </DialogTitle>
            {target && HELP[target.to] && <DialogDescription>{HELP[target.to]}</DialogDescription>}
          </DialogHeader>
          <label className="space-y-1.5 text-sm">
            <span className="font-semibold">Note (optional, saved on the booking)</span>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} className="bg-card" />
          </label>
          {msg && !msg.ok && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {msg.text}
            </p>
          )}
          <DialogFooter>
            <DialogClose className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold hover:bg-muted">
              Keep as is
            </DialogClose>
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-lake px-5 text-sm font-semibold text-sand hover:bg-lake-deep disabled:opacity-60"
            >
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {target?.label}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
