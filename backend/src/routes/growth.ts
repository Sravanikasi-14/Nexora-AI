import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { generateGroundedText } from "../services/gemini";
import { analyzeGrowth } from "../agents/growthAgent";

const router = Router();
router.use(requireAuth);

async function assertBusinessOwnership(businessId: string, userId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.userId !== userId) return null;
  return business;
}

// ---------- Insights ----------
router.get("/insights/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });
  const insights = await prisma.insight.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });
  res.json({ insights });
});

// ---------- Missions ----------
router.get("/missions/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });
  const missions = await prisma.mission.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });
  res.json({ missions });
});

const missionStatusSchema = z.object({ status: z.enum(["pending", "done", "dismissed"]) });

router.patch("/missions/:id", async (req: AuthedRequest, res) => {
  const parsed = missionStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const mission = await prisma.mission.findUnique({ where: { id: req.params.id }, include: { business: true } });
  if (!mission || mission.business.userId !== req.userId) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.mission.update({ where: { id: req.params.id }, data: { status: parsed.data.status } });
  res.json({ mission: updated });
});

// ---------- Automation ----------
router.get("/automation/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });
  const drafts = await prisma.automationDraft.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });
  res.json({ drafts });
});

// Helper for template fallbacks
function getFallbackTemplates(
  businessName: string,
  industry: string,
  goals: string,
  products: string,
  services: string
) {
  const ind = (industry + " " + products + " " + services + " " + businessName).toLowerCase();
  
  // 1. RO Purifier or Water Filters
  if (ind.includes("purifier") || ind.includes("ro") || ind.includes("water") || ind.includes("filter") || ind.includes("appliance")) {
    return [
      {
        type: "email",
        subject: `Time for Your Annual Maintenance Contract (AMC) Renewal - ${businessName}`,
        content: `Hi [Customer Name],\n\nYour annual maintenance contract with ${businessName} is expiring soon. To ensure uninterrupted access to pure, safe drinking water, renew your AMC today. Our certified technician will perform a complete health check and filter inspection.\n\nTarget Audience: Existing AMC customers\nCall To Action: Click here to renew your AMC online or reply to book a visit.`,
        reasoning: "Secures recurring contract revenue for your service team while ensuring the customer's RO purifier continues to run safely.",
      },
      {
        type: "whatsapp",
        subject: null,
        content: `Hi [Customer Name]! Quick reminder from ${businessName} 💧: It looks like your RO purifier's filters are due for replacement. Regular replacement every 6-12 months prevents impurity buildup. Would you like us to schedule a technician visit this week? Reply YES to book.`,
        reasoning: "Low-friction WhatsApp message targeted at quiet customers to trigger regular consumable sales and service bookings.",
      },
      {
        type: "instagram",
        subject: null,
        content: `Instagram Caption:\nDrink pure, live healthy! 💧 This festival season, protect your family with our advanced multi-stage RO purifiers. Get flat 15% off on brand-new installations + free AMC for the first year! 🏠✨\n\nLink in bio to browse models.\n\nHashtags: #SafeWater #ROPurifier #${businessName.replace(/\s+/g, "")} #HealthyLiving`,
        reasoning: "Captures seasonal festival demand by offering discounts on high-ticket installations paired with a free service package.",
      },
      {
        type: "followup",
        subject: "How is your new RO purifier performing?",
        content: `Hi [Customer Name],\n\nThank you for choosing ${businessName} for your home water purification. Our team recently completed your installation. How is the water quality and taste? Please take 1 minute to share feedback.\n\nTarget: Customers with installations in the last 7 days.`,
        reasoning: "Builds customer trust post-installation and captures feedback before negative reviews can go online.",
      },
      {
        type: "seasonal",
        subject: `Monsoon Pure Water Safety Check from ${businessName}`,
        content: `Hi [Customer Name],\n\nMonsoon season brings a higher risk of water contamination. Ensure your RO system is filtering at 100% efficiency. Book a Monsoon Water Quality Test with ${businessName} today for just ₹199.\n\nTarget: All registered local addresses.`,
        reasoning: "Addresses seasonal safety anxieties to drive high-volume service visits and check-ups during the rainy season.",
      },
    ];
  }

  // 2. Food & Beverage / Restaurant / Cafe / Bakery
  if (ind.includes("coffee") || ind.includes("cafe") || ind.includes("restaurant") || ind.includes("food") || ind.includes("bakery") || ind.includes("eatery") || ind.includes("niloufer")) {
    return [
      {
        type: "email",
        subject: `Exclusive Tasting Event at ${businessName}`,
        content: `Hi [Customer Name],\n\nWe are hosting an exclusive tasting event next weekend at ${businessName} and would love to invite you. We will be featuring new local items and offering special discounts for our repeat customers.\n\nTarget Audience: VIP Customers & Loyal Cohorts\nCall To Action: Reply to this email to RSVP!`,
        reasoning: "Invites your most loyal customers to a premium event, strengthening community connections and driving high-value sales.",
      },
      {
        type: "whatsapp",
        subject: null,
        content: `Hey! 👋 We missed you at ${businessName}. Here is a quick perk for your next visit: use code WELCOME10 for 10% off any purchase. Hope to see you soon!`,
        reasoning: "Direct WhatsApp message designed to re-engage customers who haven't visited in over 30 days with a low-friction incentive.",
      },
      {
        type: "instagram",
        subject: null,
        content: `Instagram Caption:\nFresh starts and friendly faces! ☕ Starting our week with your favorites. Drop by ${businessName} today and tell us what you're ordering! 👇\n\nHashtags: #SupportLocal #CafeLife #${businessName.replace(/\s+/g, "")} #LocalFaves`,
        reasoning: "Maintains digital presence activity and increases social media interactions with your local community.",
      },
      {
        type: "followup",
        subject: "We'd love your feedback!",
        content: `Hi [Customer Name],\n\nThank you for your recent visit to ${businessName}. We are always working to improve. Could you take 1 minute to let us know how your experience was?\n\nTarget Audience: Recent purchasers (last 7 days)\nFeedback request link: [Link]`,
        reasoning: "Captures customer satisfaction signals and helps resolve service improvements privately before reviews go online.",
      },
      {
        type: "seasonal",
        subject: `Celebrate the Weekend with ${businessName}!`,
        content: `Celebrate the weekend with us! Get 15% off all retail items this Saturday and Sunday only at ${businessName}.\n\nTarget Audience: All local subscribers\nWeekend Promotion`,
        reasoning: "Drives high-volume foot traffic during weekend hours to clear slow-moving inventory items.",
      },
    ];
  }

  // 3. Default General Local Business Templates
  return [
    {
      type: "email",
      subject: `Exclusive Preferred Customer Event at ${businessName}`,
      content: `Hi [Customer Name],\n\nTo thank you for supporting ${businessName}, we are hosting an exclusive preferred customer week. Enjoy priority booking, sneak previews of new inventory, and a flat 10% discount on all services.\n\nTarget Audience: Loyal repeat customers\nCall To Action: Book your appointment or order online today!`,
      reasoning: "Rewards loyal repeat buyers with exclusive access to increase customer retention and total lifetime value.",
    },
    {
      type: "whatsapp",
      subject: null,
      content: `Hello! 👋 We haven't seen you at ${businessName} recently. Here's a special thank-you perk: use code LOYAL10 for 10% off your next booking or order. Hope to assist you again soon!`,
      reasoning: "Quick re-engagement message targeted at customers inactive for 30+ days to invite them back with a direct discount.",
    },
    {
      type: "instagram",
      subject: null,
      content: `Instagram Caption:\nWe love being a part of this community! 🏠 Serving you the best quality products is our daily mission. Stop by ${businessName} this week or check out our website to see what's new!\n\nLink in bio.\n\nHashtags: #LocalBusiness #SupportLocal #${businessName.replace(/\s+/g, "")}`,
      reasoning: "Maintains active digital footprint and builds local community engagement on social channels.",
    },
    {
      type: "followup",
      subject: "Thank you for your trust!",
      content: `Hi [Customer Name],\n\nThank you for your recent purchase at ${businessName}. We hope you loved our service! Could you take a moment to share your feedback with us?\n\nFeedback link: [Link]`,
      reasoning: "Secures customer satisfaction ratings and identifies areas of friction post-purchase.",
    },
    {
      type: "seasonal",
      subject: `Special Weekend Savings at ${businessName}`,
      content: `Hi [Customer Name],\n\nMake the most of your weekend! Get 15% off on our top services this Saturday and Sunday at ${businessName}. Simply mention this message at checkout.\n\nTarget Audience: All local subscribers`,
      reasoning: "Boosts weekend transaction counts and increases revenue velocity during quieter hours.",
    },
  ];
}

// Generates marketing and CRM campaigns drafts
router.post("/automation/:businessId/generate", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const customers = await prisma.customer.findMany({ where: { businessId: business.id }, include: { sales: true } });
  const sales = await prisma.sale.findMany({ where: { businessId: business.id } });
  const customerAnalytics = await prisma.customerAnalytics.findUnique({ where: { businessId: business.id } });
  const parsedAnalytics = customerAnalytics ? JSON.parse(customerAnalytics.dataJson) : undefined;
  const growth = analyzeGrowth(sales, customers, parsedAnalytics);

  let generated = [];

  try {
    const prompt = `Generate exactly 5 distinct marketing and customer engagement automation drafts for this business: "${business.name}" in the "${business.industry}" industry.
The business goals are: "${business.goals || "Increase sales and customer retention"}".
The customer segments data: ${JSON.stringify(parsedAnalytics || "No analytics data yet")}.
The products offered: "${business.products || "None specified"}".
The services offered: "${business.services || "None specified"}".

Generate exactly these 5 types:
1. type: "email" (An Email Campaign. Content must show the Email Content, Target Audience, and Call To Action clearly).
2. type: "whatsapp" (A WhatsApp Campaign. Content must show the Promotional message / Loyalty offer).
3. type: "instagram" (An Instagram Post. Content must show the Caption, Hashtags, and a Marketing Suggestion).
4. type: "followup" (A Customer Follow-up message. Content must show the Reminder details, Discount offer, or Feedback request).
5. type: "seasonal" (A Seasonal Campaign. Content must show the Festival / Holiday / Weekend promotions).

Return a JSON array of objects with fields "type" (one of: "email", "whatsapp", "instagram", "followup", "seasonal"), "subject" (string or null, email must have a subject), "content" (string), and "reasoning" (string, explaining why this is suitable in plain non-technical language).`;

    const aiRes = await generateGroundedText({
      system: "You generate professional, high-converting marketing campaigns and drafts for small businesses. Return only a valid JSON array.",
      groundingFacts: { business, growth, segments: parsedAnalytics },
      instruction: prompt,
      maxTokens: 1200,
    });

    if (aiRes) {
      // Find JSON block
      const start = aiRes.indexOf("[");
      const end = aiRes.lastIndexOf("]") + 1;
      if (start !== -1 && end !== -1) {
        generated = JSON.parse(aiRes.slice(start, end));
      }
    }
  } catch (err) {
    console.error("[AutomationGenerator] AI generation failed, using templates", err);
  }

  // Fallback if AI was disabled or failed to generate valid JSON
  if (generated.length === 0) {
    generated = getFallbackTemplates(
      business.name,
      business.industry || "",
      business.goals || "",
      business.products || "",
      business.services || ""
    );
  }

  const created = [];
  for (const item of generated) {
    const saved = await prisma.automationDraft.create({
      data: {
        businessId: business.id,
        type: item.type,
        subject: item.subject || null,
        content: item.content,
        reasoning: item.reasoning,
        status: "draft",
      },
    });
    created.push(saved);
  }

  res.json({ drafts: created });
});

// Update Automation Draft (supports editing subject/content and status updates)
const updateDraftSchema = z.object({
  status: z.enum(["approved", "rejected", "sent"]).optional(),
  subject: z.string().optional().nullable(),
  content: z.string().optional(),
});

router.patch("/automation/:id", async (req: AuthedRequest, res) => {
  const parsed = updateDraftSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const draft = await prisma.automationDraft.findUnique({ where: { id: req.params.id }, include: { business: true } });
  if (!draft || draft.business.userId !== req.userId) return res.status(404).json({ error: "Not found" });

  const dataToUpdate: any = {};
  if (parsed.data.status !== undefined) dataToUpdate.status = parsed.data.status;
  if (parsed.data.subject !== undefined) dataToUpdate.subject = parsed.data.subject;
  if (parsed.data.content !== undefined) dataToUpdate.content = parsed.data.content;

  const updated = await prisma.automationDraft.update({
    where: { id: req.params.id },
    data: dataToUpdate,
  });
  res.json({ draft: updated });
});

export default router;
