import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { answerStrategyChat } from "../agents/strategyAgent";

const router = Router();
router.use(requireAuth);

router.get("/:businessId", async (req: AuthedRequest, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId } });
  if (!business || business.userId !== req.userId) return res.status(404).json({ error: "Not found" });

  const messages = await prisma.chatMessage.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ messages });
});

const askSchema = z.object({ businessId: z.string(), question: z.string().min(1) });

router.post("/ask", async (req: AuthedRequest, res) => {
  const parsed = askSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const business = await prisma.business.findUnique({ where: { id: parsed.data.businessId } });
  if (!business || business.userId !== req.userId) return res.status(404).json({ error: "Not found" });

  await prisma.chatMessage.create({
    data: { businessId: business.id, role: "user", content: parsed.data.question },
  });

  const answer = await answerStrategyChat(business.id, parsed.data.question);

  const saved = await prisma.chatMessage.create({
    data: { businessId: business.id, role: "assistant", content: answer },
  });

  res.json({ message: saved });
});

export default router;
