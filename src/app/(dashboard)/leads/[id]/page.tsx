import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { LeadDetail } from "@/components/leads/lead-detail";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const { id } = await params;
  const lead = await db.lead.findFirst({
    where: { id, orgId },
    include: {
      matches: { include: { property: true }, orderBy: { matchScore: "desc" } },
      outreachEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      coachSessions: { orderBy: { createdAt: "desc" }, take: 5 },
      assignedTo: true,
    },
  });

  if (!lead) notFound();

  return <LeadDetail lead={lead} />;
}
