import { cn } from "@/lib/utils";

export function ScoreBadge({ score, tier }: { score: number; tier: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white",
          tier === "HOT" && "bg-red-500",
          tier === "WARM" && "bg-orange-500",
          tier === "COLD" && "bg-blue-400"
        )}
      >
        {score}
      </div>
      <span
        className={cn(
          "text-xs font-semibold uppercase",
          tier === "HOT" && "text-red-600",
          tier === "WARM" && "text-orange-600",
          tier === "COLD" && "text-blue-500"
        )}
      >
        {tier}
      </span>
    </div>
  );
}
