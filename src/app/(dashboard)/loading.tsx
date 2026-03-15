import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* KPI Cards skeleton — 6 cards in a row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Chart + Funnel row skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-[250px] w-full" />
        </div>
        <div className="rounded-xl border p-4 space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-[250px] w-full" />
        </div>
      </div>

      {/* Recent leads table skeleton */}
      <div className="rounded-xl border p-4 space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
