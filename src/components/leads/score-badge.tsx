import { cn } from "@/lib/utils";

export function ScoreBadge({ score, tier }: { score: number | null; tier: string | null }) {
  const safeScore = score ?? 0;
  const safeTier = tier ?? "COLD";

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white",
          safeTier === "HOT" && "bg-red-500",
          safeTier === "WARM" && "bg-amber-500",
          safeTier === "COLD" && "bg-slate-400",
          !["HOT", "WARM", "COLD"].includes(safeTier) && "bg-zinc-300"
        )}
      >
        {score != null ? safeScore : "?"}
      </div>
      <span
        className={cn(
          "text-xs font-semibold uppercase",
          safeTier === "HOT" && "text-red-600",
          safeTier === "WARM" && "text-amber-600",
          safeTier === "COLD" && "text-zinc-500",
          !["HOT", "WARM", "COLD"].includes(safeTier) && "text-zinc-500"
        )}
      >
        {score != null ? safeTier : "Unscored"}
      </span>
    </div>
  );
}
