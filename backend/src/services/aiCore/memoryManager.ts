import { prisma } from "../../lib/prisma";

export async function loadHistory(businessId: string): Promise<string> {
  const chatHistory = await prisma.chatMessage.findMany({
    where: { businessId },
    orderBy: { createdAt: "asc" },
  });

  const recentHistory = chatHistory.slice(-10);
  return recentHistory
    .map((m) => `${m.role === "user" ? "User" : "Nexora"}: ${m.content}`)
    .join("\n");
}

export async function saveMessage(
  businessId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await prisma.chatMessage.create({
    data: {
      businessId,
      role,
      content,
    },
  });
}
