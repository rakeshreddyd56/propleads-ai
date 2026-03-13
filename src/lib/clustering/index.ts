/**
 * Cross-platform Lead Clustering — Pro tier only.
 *
 * Links the same person discovered across multiple platforms by matching:
 * 1. Exact email match (highest confidence)
 * 2. Exact phone match
 * 3. Normalized name match (same org, similar name across platforms)
 *
 * Creates/updates LeadCluster records that group related leads.
 */

import { db } from "@/lib/db";

/**
 * Cluster a single lead — find or create a cluster for it.
 * Called after enrichment discovers email/phone, or during batch clustering.
 */
export async function clusterLead(leadId: string): Promise<string | null> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      orgId: true,
      name: true,
      email: true,
      phone: true,
      platform: true,
      score: true,
      tier: true,
      clusterId: true,
    },
  });
  if (!lead) return null;

  // Already clustered — just update the cluster stats
  if (lead.clusterId) {
    await refreshClusterStats(lead.clusterId);
    return lead.clusterId;
  }

  // Try to find an existing cluster by email
  if (lead.email) {
    const match = await db.lead.findFirst({
      where: {
        orgId: lead.orgId,
        email: lead.email,
        id: { not: lead.id },
        clusterId: { not: null },
      },
      select: { clusterId: true },
    });
    if (match?.clusterId) {
      await db.lead.update({ where: { id: lead.id }, data: { clusterId: match.clusterId } });
      await refreshClusterStats(match.clusterId);
      return match.clusterId;
    }

    // Check for another lead with same email but no cluster
    const emailSibling = await db.lead.findFirst({
      where: {
        orgId: lead.orgId,
        email: lead.email,
        id: { not: lead.id },
        platform: { not: lead.platform },
      },
      select: { id: true },
    });
    if (emailSibling) {
      const cluster = await createClusterForLeads(lead.orgId, [lead.id, emailSibling.id], {
        primaryEmail: lead.email,
        primaryName: lead.name,
      });
      return cluster.id;
    }
  }

  // Try to find an existing cluster by phone
  if (lead.phone) {
    const normalizedPhone = normalizePhone(lead.phone);
    const match = await db.lead.findFirst({
      where: {
        orgId: lead.orgId,
        id: { not: lead.id },
        clusterId: { not: null },
        phone: { not: null },
      },
      select: { clusterId: true, phone: true },
    });
    if (match?.phone && normalizePhone(match.phone) === normalizedPhone && match.clusterId) {
      await db.lead.update({ where: { id: lead.id }, data: { clusterId: match.clusterId } });
      await refreshClusterStats(match.clusterId);
      return match.clusterId;
    }

    // Check for phone sibling without cluster
    const allLeadsWithPhone = await db.lead.findMany({
      where: {
        orgId: lead.orgId,
        id: { not: lead.id },
        phone: { not: null },
        platform: { not: lead.platform },
      },
      select: { id: true, phone: true },
    });
    const phoneSibling = allLeadsWithPhone.find(
      (l) => l.phone && normalizePhone(l.phone) === normalizedPhone
    );
    if (phoneSibling) {
      const cluster = await createClusterForLeads(lead.orgId, [lead.id, phoneSibling.id], {
        primaryPhone: lead.phone,
        primaryName: lead.name,
      });
      return cluster.id;
    }
  }

  // Try name-based matching (less confident — require exact normalized name + different platform)
  if (lead.name && lead.name !== "unknown" && lead.name.length > 3) {
    const normalizedName = normalizeName(lead.name);
    const candidates = await db.lead.findMany({
      where: {
        orgId: lead.orgId,
        id: { not: lead.id },
        platform: { not: lead.platform },
        name: { not: null },
      },
      select: { id: true, name: true, clusterId: true },
      take: 100,
    });

    const nameMatch = candidates.find(
      (c) => c.name && normalizeName(c.name) === normalizedName
    );
    if (nameMatch) {
      if (nameMatch.clusterId) {
        await db.lead.update({ where: { id: lead.id }, data: { clusterId: nameMatch.clusterId } });
        await refreshClusterStats(nameMatch.clusterId);
        return nameMatch.clusterId;
      }
      const cluster = await createClusterForLeads(lead.orgId, [lead.id, nameMatch.id], {
        primaryName: lead.name,
      });
      return cluster.id;
    }
  }

  return null;
}

/**
 * Batch-cluster all unclustered leads for an org.
 * Pro tier only. Processes up to 50 leads per batch.
 */
export async function clusterAllLeads(orgId: string): Promise<{
  processed: number;
  clustered: number;
  totalClusters: number;
}> {
  const leads = await db.lead.findMany({
    where: { orgId, clusterId: null },
    select: { id: true },
    take: 50,
    orderBy: { score: "desc" },
  });

  let clustered = 0;
  for (const lead of leads) {
    const result = await clusterLead(lead.id);
    if (result) clustered++;
  }

  const totalClusters = await db.leadCluster.count({ where: { orgId } });

  return {
    processed: leads.length,
    clustered,
    totalClusters,
  };
}

/**
 * Get cluster details with all linked leads.
 */
export async function getClusterDetails(clusterId: string) {
  return db.leadCluster.findUnique({
    where: { id: clusterId },
    include: {
      leads: {
        select: {
          id: true,
          name: true,
          platform: true,
          email: true,
          phone: true,
          score: true,
          tier: true,
          sourceUrl: true,
          createdAt: true,
        },
        orderBy: { score: "desc" },
      },
    },
  });
}

// --- Internal helpers ---

async function createClusterForLeads(
  orgId: string,
  leadIds: string[],
  data: { primaryName?: string | null; primaryEmail?: string | null; primaryPhone?: string | null }
) {
  const cluster = await db.leadCluster.create({
    data: {
      orgId,
      primaryName: data.primaryName,
      primaryEmail: data.primaryEmail,
      primaryPhone: data.primaryPhone,
      platformCount: leadIds.length,
    },
  });

  await db.lead.updateMany({
    where: { id: { in: leadIds } },
    data: { clusterId: cluster.id },
  });

  await refreshClusterStats(cluster.id);
  return cluster;
}

async function refreshClusterStats(clusterId: string) {
  const leads = await db.lead.findMany({
    where: { clusterId },
    select: { platform: true, score: true, tier: true, email: true, phone: true, name: true },
  });

  const platforms = new Set(leads.map((l) => l.platform));
  const bestLead = leads.reduce((best, l) => (l.score > best.score ? l : best), leads[0]);

  await db.leadCluster.update({
    where: { id: clusterId },
    data: {
      platformCount: platforms.size,
      bestScore: bestLead?.score ?? 0,
      bestTier: bestLead?.tier ?? "COLD",
      primaryEmail: leads.find((l) => l.email)?.email ?? undefined,
      primaryPhone: leads.find((l) => l.phone)?.phone ?? undefined,
      primaryName: leads.find((l) => l.name)?.name ?? undefined,
    },
  });
}

function normalizePhone(phone: string): string {
  // Strip everything except digits, keep last 10 digits (Indian mobile)
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^a-z\s]/g, "");
}
