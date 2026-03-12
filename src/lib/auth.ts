import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Resolves the Clerk auth session to a database Organization ID.
 * - If user has a Clerk org, maps it to a DB org (auto-creates on first use).
 * - If no Clerk org, creates a personal workspace keyed by userId.
 * Returns null if user is not authenticated.
 */
export async function resolveOrg(): Promise<string | null> {
  const { orgId: clerkOrgId, orgSlug, userId } = await auth();
  if (!userId) return null;

  if (clerkOrgId) {
    let org = await db.organization.findUnique({ where: { clerkOrgId } });
    if (!org) {
      org = await db.organization.create({
        data: {
          clerkOrgId,
          name: orgSlug ?? "My Organization",
          slug: orgSlug ?? `org-${clerkOrgId.replace("org_", "")}`,
        },
      });
    }
    return org.id;
  }

  // No Clerk org → personal workspace
  const personalSlug = `user-${userId.replace("user_", "")}`;
  let org = await db.organization.findUnique({ where: { slug: personalSlug } });
  if (!org) {
    org = await db.organization.create({
      data: {
        name: "My Workspace",
        slug: personalSlug,
      },
    });
  }
  return org.id;
}

/**
 * Returns both orgId (DB) and userId (Clerk) for routes that need both.
 */
export async function resolveAuth(): Promise<{ orgId: string; userId: string } | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const orgId = await resolveOrg();
  if (!orgId) return null;
  return { orgId, userId };
}
