import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { generateGroundedText } from "../services/gemini";
import { analyzeGrowth } from "../agents/growthAgent";
import { generateAutomationDraft } from "../agents/automationAgent";
import { calculateMissionImpact } from "../agents/revenueImpactAgent";

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

  const customers = await prisma.customer.findMany({ where: { businessId: business.id } });
  const sales = await prisma.sale.findMany({ where: { businessId: business.id } });

  const enriched = missions.map((m) => {
    const impact = calculateMissionImpact(m, sales, customers);
    return {
      ...m,
      projectedImpact: impact.projectedImpact,
      projectedImpactBasis: impact.projectedImpactBasis,
    };
  });

  res.json({ missions: enriched });
});

const missionStatusSchema = z.object({ status: z.enum(["pending", "done", "dismissed"]) });

router.patch("/missions/:id", async (req: AuthedRequest, res) => {
  const parsed = missionStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const mission = await prisma.mission.findUnique({ where: { id: req.params.id }, include: { business: true } });
  if (!mission || mission.business.userId !== req.userId) return res.status(404).json({ error: "Not found" });

  const updated = await prisma.mission.update({ where: { id: req.params.id }, data: { status: parsed.data.status } });

  const customers = await prisma.customer.findMany({ where: { businessId: mission.businessId } });
  const sales = await prisma.sale.findMany({ where: { businessId: mission.businessId } });
  const impact = calculateMissionImpact(updated as any, sales, customers);

  const enriched = {
    ...updated,
    projectedImpact: impact.projectedImpact,
    projectedImpactBasis: impact.projectedImpactBasis,
  };

  res.json({ mission: enriched });
});

// ---------- Automation ----------
router.get("/automation/:businessId", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });
  const drafts = await prisma.automationDraft.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" } });
  
  const enrichedDrafts = await Promise.all(
    drafts.map(async (d) => {
      let customer = null;
      if (d.targetCustomerId) {
        customer = await prisma.customer.findUnique({
          where: { id: d.targetCustomerId },
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        });
      }
      return { ...d, customer };
    })
  );

  res.json({ drafts: enrichedDrafts });
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
1. type: "email" (An Email Campaign. The content field must contain ONLY the actual email body message. Do NOT include metadata like "Target Audience" or "Call To Action" inside content. Place any target audience suggestions or call-to-action details inside the reasoning field).
2. type: "whatsapp" (A WhatsApp Campaign. The content field must contain ONLY the actual promotional message/loyalty offer text to be sent directly to the customer).
3. type: "instagram" (An Instagram Post. The content field must contain ONLY the post caption and hashtags).
4. type: "followup" (A Customer Check-in message. The content field must contain ONLY the check-in or feedback text).
5. type: "seasonal" (A Seasonal Campaign. The content field must contain ONLY the promotional weekend/holiday message).

CRITICAL: For all types, the "content" field MUST contain ONLY final customer-facing message copy. Never mix meta-commentary, headers, target audience lists, or call-to-action labels into "content". Put all target audience details, marketing recommendations, and call-to-action suggestions in the "reasoning" field instead.

Return a JSON array of objects with fields "type" (one of: "email", "whatsapp", "instagram", "followup", "seasonal"), "subject" (string or null, email must have a subject), "content" (string), and "reasoning" (string, explaining why this is suitable along with target audience/call-to-action suggestions).`;

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
    created.push({ ...saved, customer: null });
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
  if (parsed.data.status !== undefined) {
    dataToUpdate.status = parsed.data.status;
    if (parsed.data.status === "approved") {
      dataToUpdate.approvedAt = new Date();
    }
  }
  if (parsed.data.subject !== undefined) dataToUpdate.subject = parsed.data.subject;
  if (parsed.data.content !== undefined) dataToUpdate.content = parsed.data.content;

  const updated = await prisma.automationDraft.update({
    where: { id: req.params.id },
    data: dataToUpdate,
  });

  let customer = null;
  if (updated.targetCustomerId) {
    customer = await prisma.customer.findUnique({
      where: { id: updated.targetCustomerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        leadStatus: true,
      },
    });
  }

  res.json({ draft: updated, customer });
});

// GET Suggested messages for a business (targetCustomerId is not null)
router.get("/automation/:businessId/suggestions", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const drafts = await prisma.automationDraft.findMany({
    where: {
      businessId: business.id,
      targetCustomerId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  const enrichedDrafts = await Promise.all(
    drafts.map(async (d) => {
      const customer = await prisma.customer.findUnique({
        where: { id: d.targetCustomerId! },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          leadStatus: true,
          notes: true,
        },
      });
      return { ...d, customer };
    })
  );

  res.json({ drafts: enrichedDrafts });
});

// POST Generate suggested messages for a business
router.post("/automation/:businessId/generate-suggestions", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id },
    include: { sales: { orderBy: { date: "desc" } } },
  });

  if (customers.length === 0) {
    return res.json({ drafts: [] });
  }

  const generatedSuggestions: Array<{
    customerId: string;
    category: string;
    reason: string;
    confidence: string;
    content: string;
  }> = [];

  const now = new Date();
  const customersData = customers.map(c => {
    const daysSinceLastPurchase = c.lastPurchaseAt
      ? Math.floor((now.getTime() - new Date(c.lastPurchaseAt).getTime()) / (24 * 60 * 60 * 1000))
      : null;
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      leadStatus: c.leadStatus || "New",
      city: c.city,
      notes: c.notes,
      lifetimeValue: c.lifetimeValue,
      daysSinceLastPurchase,
      salesCount: c.sales.length,
    };
  });

  let useFallback = false;
  try {
    const prompt = `You are an AI suggestion engine for a Real Estate / CRM dashboard called Nexora.
Analyze the following customers for business "${business.name}" (Industry: "${business.industry || "Real Estate"}", Goals: "${business.goals || "Increase sales and customer engagement"}").
For each qualified customer, generate a personalized WhatsApp outreach message draft based on their CRM history, notes, and activity.

We support generating suggestions for:
- "New lead with no follow-up"
- "Customer hasn't replied in several days"
- "Site visit reminder"
- "Site visit follow-up"
- "New property matching customer's preferences" (Budget, bedrooms, preferred location from customer notes)
- "Payment reminder"
- "Documentation reminder"
- "Thank-you after inquiry"
- "Festival greetings"
- "Re-engagement for inactive leads"

STRICT RULES:
1. Do NOT suggest messages for all customers. Only suggest for those where there is a clear, meaningful reason.
2. Personalize each message using the customer's name.
3. Mention specific property details (like Green Valley, 3BHK project, location) from customer notes if applicable.
4. Keep messages polite, professional, concise, and natural (never robotic or overly sales-focused).
5. Output MUST be a JSON array of objects, each containing:
   - customerId (exact customer ID from data)
   - category (one of: "Follow-up", "Reminder", "Site Visit", "Payment", "Greeting", "Re-engagement", "Thank-you")
   - reason (the explanation for the suggestion, e.g. "Customer has not been contacted for 6 days.")
   - confidence ("High" | "Medium" | "Low")
   - content (the actual customer-facing WhatsApp message copy)

Customers data:
${JSON.stringify(customersData, null, 2)}`;

    const aiRes = await generateGroundedText({
      system: "You generate professional, highly targeted CRM communication drafts and suggestions. You output only a valid JSON array of objects.",
      groundingFacts: { business, customersCount: customers.length },
      instruction: prompt,
      maxTokens: 2000,
    });

    if (aiRes) {
      const start = aiRes.indexOf("[");
      const end = aiRes.lastIndexOf("]") + 1;
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(aiRes.slice(start, end));
        if (Array.isArray(parsed)) {
          generatedSuggestions.push(...parsed);
        }
      } else {
        useFallback = true;
      }
    } else {
      useFallback = true;
    }
  } catch (err) {
    console.error("[GenerateSuggestions] AI generation failed, using fallback templates", err);
    useFallback = true;
  }

  // Fallback template engine
  if (useFallback || generatedSuggestions.length === 0) {
    console.log("[GenerateSuggestions] Running fallback rule engine...");
    for (const c of customers) {
      const name = c.name;
      const firstName = name.split(" ")[0];
      const notesLower = (c.notes || "").toLowerCase();
      const status = c.leadStatus || "New";

      let matched = false;

      // 1. Payment reminder
      if (!matched && (notesLower.includes("payment") || notesLower.includes("due") || notesLower.includes("pending payment"))) {
        generatedSuggestions.push({
          customerId: c.id,
          category: "Payment",
          reason: "Payment due details found in customer profile notes.",
          confidence: "High",
          content: `Hi ${firstName}, hope you're doing well. Just a gentle reminder regarding the next payment milestone for your property booking with ${business.name}. Please let us know if you need any assistance or documentation for the process.`,
        });
        matched = true;
      }

      // 2. Site Visit scheduled / reminder
      if (!matched && (notesLower.includes("site visit") || notesLower.includes("visit") || notesLower.includes("schedule visit"))) {
        generatedSuggestions.push({
          customerId: c.id,
          category: "Site Visit",
          reason: "Site visit mentioned in customer notes.",
          confidence: "High",
          content: `Hi ${firstName}, I hope you're having a great week! Just wanted to follow up on your interest in our Green Valley project. Would you like us to schedule a site visit this weekend so we can show you around? Let us know what time works best for you.`,
        });
        matched = true;
      }

      // 3. Documentation reminder
      if (!matched && (notesLower.includes("document") || notesLower.includes("paperwork") || notesLower.includes("registration"))) {
        generatedSuggestions.push({
          customerId: c.id,
          category: "Reminder",
          reason: "Documentation action item detected in notes.",
          confidence: "High",
          content: `Hi ${firstName}, hope you're doing well. We wanted to remind you to share the pending documents required for your registry. This will help us finalize the paperwork at the earliest. Let us know if you have any questions!`,
        });
        matched = true;
      }

      // 4. New lead with no follow-up / Thank-you after inquiry
      if (!matched && status === "New") {
        generatedSuggestions.push({
          customerId: c.id,
          category: "Thank-you",
          reason: "New customer added with lead status New.",
          confidence: "High",
          content: `Hi ${firstName}, thank you for reaching out to ${business.name}! We received your inquiry regarding our properties. I'd love to share some brochure options that match your budget. When is a good time for a short call?`,
        });
        matched = true;
      }

      // 5. Inactive leads / Re-engagement
      if (!matched && (!c.lastPurchaseAt || (now.getTime() - new Date(c.lastPurchaseAt).getTime()) > 30 * 86400000)) {
        generatedSuggestions.push({
          customerId: c.id,
          category: "Re-engagement",
          reason: "No purchase or follow-up in the last 30 days.",
          confidence: "Medium",
          content: `Hi ${firstName}, hope you're doing well! It's been a while since we connected. We just launched a premium 3BHK project in a prime location. Would you be interested in receiving the layout and pricing details?`,
        });
        matched = true;
      }

      // 6. Follow-up Required
      if (!matched && status === "Follow-up Required") {
        generatedSuggestions.push({
          customerId: c.id,
          category: "Follow-up",
          reason: "Lead status is set to Follow-up Required.",
          confidence: "High",
          content: `Hi ${firstName}, hope you're doing well. I'm checking in to see if you had a chance to review the property pricing we sent over. Let me know if you would like to discuss it further or schedule a call.`,
        });
        matched = true;
      }
    }
  }

  // Save drafts and apply duplicate prevention
  const createdDrafts = [];
  for (const item of generatedSuggestions) {
    const customer = customers.find(c => c.id === item.customerId);
    if (!customer) continue;

    const existing = await prisma.automationDraft.findFirst({
      where: {
        businessId: business.id,
        targetCustomerId: item.customerId,
        category: item.category,
        status: "draft",
      },
    });

    if (existing) {
      continue;
    }

    const saved = await prisma.automationDraft.create({
      data: {
        businessId: business.id,
        type: "whatsapp",
        targetCustomerId: item.customerId,
        content: item.content,
        reasoning: item.reason,
        reason: item.reason,
        confidence: item.confidence,
        category: item.category,
        status: "draft",
      },
    });

    createdDrafts.push({
      ...saved,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        leadStatus: customer.leadStatus,
        notes: customer.notes,
      },
    });
  }

  res.json({ drafts: createdDrafts });
});

// POST Regenerate suggested message with tone/style options
router.post("/automation/draft/:id/regenerate", async (req: AuthedRequest, res) => {
  const { style } = req.body;
  if (!style || !["Friendlier", "More Professional", "Shorter", "More Persuasive"].includes(style)) {
    return res.status(400).json({ error: "Invalid style parameter" });
  }

  const draft = await prisma.automationDraft.findUnique({
    where: { id: req.params.id },
    include: { business: true },
  });

  if (!draft || draft.business.userId !== req.userId) {
    return res.status(404).json({ error: "Draft not found" });
  }

  if (!draft.targetCustomerId) {
    return res.status(400).json({ error: "Draft must have a target customer to regenerate" });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: draft.targetCustomerId },
  });

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  let rewrittenText = "";
  let useFallback = false;

  try {
    const prompt = `You are an AI assistant. Rewrite the following WhatsApp message draft for customer "${customer.name}" in a "${style}" style.
Original Message: "${draft.content}"
Reason for Outreach: "${draft.reason || draft.reasoning}"
Business Name: "${draft.business.name}"

STRICT RULES:
1. Do NOT include any headers, subject, quotes, greeting-labels, tags, or metadata in the message body.
2. Return ONLY the rewritten message text itself.
3. Keep the tone human-like, warm, and natural for WhatsApp. Keep the length concise.`;

    const aiRes = await generateGroundedText({
      system: "You rewrite text in specific tones and styles. You output ONLY the final rewritten text.",
      groundingFacts: { customerName: customer.name, businessName: draft.business.name },
      instruction: prompt,
      maxTokens: 400,
    });

    if (aiRes) {
      rewrittenText = aiRes.trim();
    } else {
      useFallback = true;
    }
  } catch (err) {
    console.error("[RegenerateDraft] AI generation failed, using fallback tone converter", err);
    useFallback = true;
  }

  if (useFallback || !rewrittenText) {
    const firstName = customer.name.split(" ")[0];
    const baseMessage = draft.content;
    if (style === "Shorter") {
      rewrittenText = baseMessage.length > 80 
        ? baseMessage.slice(0, 80) + "..."
        : baseMessage;
    } else if (style === "Friendlier") {
      rewrittenText = `Hey ${firstName}! 😊 Just wanted to connect and check in. ${baseMessage}`;
    } else if (style === "More Professional") {
      rewrittenText = `Dear ${customer.name}, we would like to connect regarding our previous conversation. ${baseMessage}`;
    } else if (style === "More Persuasive") {
      rewrittenText = `${baseMessage} We have limited slots, so let us know at your convenience if you'd like to check this out!`;
    } else {
      rewrittenText = baseMessage;
    }
  }

  const updated = await prisma.automationDraft.update({
    where: { id: draft.id },
    data: {
      content: rewrittenText,
    },
  });

  const enriched = {
    ...updated,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      leadStatus: customer.leadStatus,
      notes: customer.notes,
    },
  };

  res.json({ draft: enriched });
});

// POST Bulk update status for drafts
router.post("/automation/:businessId/bulk-update", async (req: AuthedRequest, res) => {
  const business = await assertBusinessOwnership(req.params.businessId, req.userId!);
  if (!business) return res.status(404).json({ error: "Not found" });

  const { ids, status } = req.body;
  if (!Array.isArray(ids) || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  await prisma.automationDraft.updateMany({
    where: {
      id: { in: ids },
      businessId: business.id,
    },
    data: {
      status,
      approvedAt: status === "approved" ? new Date() : null,
    },
  });

  res.json({ success: true });
});

const draftRequestSchema = z.object({
  customerId: z.string(),
  type: z.enum(["whatsapp", "email", "reminder", "task", "followup"]),
});

router.post("/automation/draft", async (req: AuthedRequest, res) => {
  const parsed = draftRequestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { customerId, type } = parsed.data;

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { business: true },
  });

  if (!customer) {
    return res.status(404).json({ error: "Customer not found" });
  }

  if (customer.business.userId !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const now = Date.now();
  const daysSinceLastPurchase = customer.lastPurchaseAt
    ? Math.floor((now - new Date(customer.lastPurchaseAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  const reason = `Hasn't purchased in ${daysSinceLastPurchase ?? 0} days. Lifetime value ₹${customer.lifetimeValue}.`;

  try {
    const generated = await generateAutomationDraft({
      type,
      customer,
      businessName: customer.business.name,
      reason,
    });

    const savedDraft = await prisma.automationDraft.create({
      data: {
        businessId: customer.businessId,
        type,
        targetCustomerId: customer.id,
        subject: generated.subject,
        content: generated.content,
        reasoning: generated.reasoning,
        status: "draft",
      },
    });

    res.json({
      draft: {
        ...savedDraft,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          leadStatus: customer.leadStatus,
        },
      },
    });
  } catch (err) {
    console.error("[SingleAutomationDraft] Generation failed", err);
    res.status(500).json({ error: "Failed to generate win-back draft" });
  }
});

export default router;

