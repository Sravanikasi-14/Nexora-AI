import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { runAssessmentPipeline } from "../agents/strategyAgent";

const router = Router();
router.use(requireAuth);

async function assertOwnership(businessId: string, userId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.userId !== userId) return null;
  return business;
}

// Runs the full Discovery -> Memory -> Digital Presence -> Growth -> Insight -> Strategy pipeline
router.post("/:businessId/run", async (req: AuthedRequest, res) => {
  const business = await assertOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const assessment = await runAssessmentPipeline(business.id);

  await prisma.business.update({ where: { id: business.id }, data: { discoveryComplete: true } });

  res.json({
    hasEnoughData: assessment.hasEnoughData,
    readinessScore: assessment.readinessScore,
    confidenceScore: assessment.confidenceScore,
    digitalMaturity: assessment.digitalMaturity,
    growthScore: assessment.growthScore,
    strengths: JSON.parse(assessment.strengthsJson),
    weaknesses: JSON.parse(assessment.weaknessesJson),
    missingAssets: JSON.parse(assessment.missingAssetsJson),
    recommendedFirstAction: assessment.recommendedFirstAction,
    roadmap: JSON.parse(assessment.roadmapJson),
    missingInfoExplanation: assessment.missingInfoExplanation,
  });
});

router.get("/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const assessment = await prisma.assessment.findUnique({ where: { businessId: business.id } });
  if (!assessment) return res.json({ exists: false });

  res.json({
    exists: true,
    hasEnoughData: assessment.hasEnoughData,
    readinessScore: assessment.readinessScore,
    confidenceScore: assessment.confidenceScore,
    digitalMaturity: assessment.digitalMaturity,
    growthScore: assessment.growthScore,
    strengths: JSON.parse(assessment.strengthsJson),
    weaknesses: JSON.parse(assessment.weaknessesJson),
    missingAssets: JSON.parse(assessment.missingAssetsJson),
    recommendedFirstAction: assessment.recommendedFirstAction,
    roadmap: JSON.parse(assessment.roadmapJson),
    missingInfoExplanation: assessment.missingInfoExplanation,
  });
});

export default router;
