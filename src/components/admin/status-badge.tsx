import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/lib/supabase/types";

const STYLES: Record<BookingStatus, string> = {
  pending_payment: "bg-sunset/20 text-sunset-deep ring-sunset/40",
  confirmed: "bg-forest/10 text-forest ring-forest/30",
  completed: "bg-lake/10 text-lake ring-lake/25",
  cancelled: "bg-ink/5 text-muted-foreground ring-ink/15",
};
const LABEL: Record<BookingStatus, string> = {
  pending_payment: "Pending payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function StatusBadge({ status, expired }: { status: BookingStatus; expired?: boolean }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1", STYLES[status])}>
      {status === "pending_payment" && expired ? "Hold expired" : LABEL[status]}
    </span>
  );
}
