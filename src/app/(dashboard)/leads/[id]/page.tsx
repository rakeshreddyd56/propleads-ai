import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/auth";
import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/leads/lead-detail";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return <div className="p-6 text-center text-zinc-400">Please create or select an organization to get started.</div>;

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, orgId },
    include: {
      matches: { include: { property: true }, orderBy: { matchScore: "desc" } },
      outreachEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      coachSessions: { orderBy: { createdAt: "desc" }, take: 5 },
      assignedTo: true,
      cluster: {
        include: {
          leads: {
            select: { id: true, name: true, platform: true, score: true, tier: true },
            orderBy: { score: "desc" },
          },
        },
      },
    },
  });

  if (!lead) notFound();

  // Convert BigInt fields to Number for client component serialization
  const serialized = {
    ...lead,
    budgetMin: lead.budgetMin ? Number(lead.budgetMin) : null,
    budgetMax: lead.budgetMax ? Number(lead.budgetMax) : null,
    matches: lead.matches.map((m) => ({
      ...m,
      property: m.property
        ? {
            ...m.property,
            priceMin: m.property.priceMin ? Number(m.property.priceMin) : null,
            priceMax: m.property.priceMax ? Number(m.property.priceMax) : null,
          }
        : m.property,
    })),
  };

  return <LeadDetail lead={serialized} />;
}
