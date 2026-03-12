import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { LeadTable } from "@/components/leads/lead-table";
import { Flame, Sun, Snowflake } from "lucide-react";

export default async function LeadsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [leads, counts] = await Promise.all([
    db.lead.findMany({
      where: { orgId },
      orderBy: { score: "desc" },
      take: 100,
      include: {
        matches: { include: { property: true }, take: 1, orderBy: { matchScore: "desc" } },
        _count: { select: { outreachEvents: true } },
      },
    }),
    db.lead.groupBy({
      by: ["tier"],
      where: { orgId },
      _count: true,
    }),
  ]);

  const tierCounts = { HOT: 0, WARM: 0, COLD: 0 };
  counts.forEach((c) => { tierCounts[c.tier as keyof typeof tierCounts] = c._count; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-zinc-500">{leads.length} leads from all sources</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 rounded-lg border bg-red-50 p-4 dark:bg-red-950">
          <Flame className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-red-700">{tierCounts.HOT}</p>
            <p className="text-xs text-red-600">Hot Leads</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-orange-50 p-4 dark:bg-orange-950">
          <Sun className="h-8 w-8 text-orange-500" />
          <div>
            <p className="text-2xl font-bold text-orange-700">{tierCounts.WARM}</p>
            <p className="text-xs text-orange-600">Warm Leads</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
          <Snowflake className="h-8 w-8 text-blue-400" />
          <div>
            <p className="text-2xl font-bold text-blue-600">{tierCounts.COLD}</p>
            <p className="text-xs text-blue-500">Cold Leads</p>
          </div>
        </div>
      </div>

      <LeadTable leads={leads} />
    </div>
  );
}
