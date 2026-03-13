import { db } from "@/lib/db";
import { resolveOrg } from "@/lib/auth";
import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/leads/lead-detail";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const orgId = await resolveOrg();
  if (!orgId) return null;

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

  return <LeadDetail lead={lead} />;
}
