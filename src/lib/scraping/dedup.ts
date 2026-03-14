import { createHash } from "crypto";
import { db } from "@/lib/db";

export function hashPost(_platform: string, authorId: string, text: string): string {
  // Platform-agnostic hash: same author + same text = duplicate regardless of platform.
  // Hashes are already scoped per-org in filterNewPosts, so orgId|authorId|text is sufficient.
  const normalized = `${authorId}|${text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200)}`;
  return createHash("sha256").update(normalized).digest("hex");
}

export async function filterNewPosts<T extends { authorId: string; text: string }>(
  orgId: string,
  platform: string,
  posts: T[]
): Promise<{ newPosts: T[]; skippedCount: number }> {
  if (posts.length === 0) return { newPosts: [], skippedCount: 0 };

  const postHashes = posts.map((p) => ({
    post: p,
    hash: hashPost(platform, p.authorId, p.text),
  }));

  const existingHashes = await db.postHash.findMany({
    where: { orgId, hash: { in: postHashes.map((ph) => ph.hash) } },
    select: { hash: true },
  });

  const existingSet = new Set(existingHashes.map((h) => h.hash));
  const newEntries = postHashes.filter((ph) => !existingSet.has(ph.hash));
  const skippedCount = posts.length - newEntries.length;

  if (newEntries.length > 0) {
    await db.postHash.createMany({
      data: newEntries.map((ph) => ({
        orgId,
        hash: ph.hash,
        platform: platform as any,
      })),
      skipDuplicates: true,
    });
  }

  return { newPosts: newEntries.map((e) => e.post), skippedCount };
}
