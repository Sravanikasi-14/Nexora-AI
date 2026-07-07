import { prisma } from "../lib/prisma";

export async function recordMemory(businessId: string, type: string, summary: string) {
  return prisma.memoryEvent.create({ data: { businessId, type, summary } });
}

export async function recallMemory(businessId: string, limit = 20) {
  return prisma.memoryEvent.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Builds a short natural-language memory digest to ground other agents / chat. */
export async function memoryDigest(businessId: string): Promise<string> {
  const events = await recallMemory(businessId, 8);
  if (events.length === 0) return "No prior activity recorded for this business yet.";
  return events
    .slice()
    .reverse()
    .map((e: { summary: string }) => `- ${e.summary}`)
    .join("\n");
}
