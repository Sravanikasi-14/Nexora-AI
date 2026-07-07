import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { getDashboardPayload } from "../agents/strategyAgent";

const router = Router();
router.use(requireAuth);

router.get("/:businessId", async (req: AuthedRequest, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId } });
  if (!business || business.userId !== req.userId) return res.status(404).json({ error: "Not found" });

  const payload = await getDashboardPayload(business.id);
  res.json(payload);
});

export default router;
