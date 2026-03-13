import { db } from "@/lib/db";
import type { PlanTier } from "./tiers";

export async function createRunGroup(orgId: string, tier: PlanTier, sourcesTotal: number) {
  return db.runGroup.create({
    data: { orgId, tier, sourcesTotal, status: "RUNNING" },
  });
}

export async function markSourceCompleted(runGroupId: string, newLeads: number, updatedLeads: number) {
  await db.runGroup.update({
    where: { id: runGroupId },
    data: {
      sourcesCompleted: { increment: 1 },
      totalNewLeads: { increment: newLeads },
      totalUpdatedLeads: { increment: updatedLeads },
    },
  });
}

export async function markSourceErrored(runGroupId: string) {
  await db.runGroup.update({
    where: { id: runGroupId },
    data: { sourcesErrored: { increment: 1 } },
  });
}

export async function completeRunGroup(runGroupId: string) {
  const group = await db.runGroup.findUnique({ where: { id: runGroupId } });
  if (!group) return;

  const status =
    group.sourcesErrored === group.sourcesTotal
      ? "FAILED"
      : group.sourcesErrored > 0
        ? "PARTIAL"
        : "COMPLETED";

  return db.runGroup.update({
    where: { id: runGroupId },
    data: { status, completedAt: new Date() },
  });
}

export async function incrementOrgRunCount(orgId: string) {
  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { runsToday: true, runsResetAt: true },
  });

  const now = new Date();
  const isNewDay = !org?.runsResetAt || org.runsResetAt.toDateString() !== now.toDateString();

  await db.organization.update({
    where: { id: orgId },
    data: {
      runsToday: isNewDay ? 1 : { increment: 1 },
      runsResetAt: isNewDay ? now : undefined,
    },
  });
}
