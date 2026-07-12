import { classifyIntent, IntentType } from "./intentRouter";
import { generateExecutionPlan } from "./planner";
import { executeAction, ToolCallResult } from "./actionEngine";
import { gatherContext } from "./contextManager";
import { rankAndFilterContext } from "./contextRanker";
import { buildPrompt } from "./promptBuilder";
import { generateContent, isGeminiEnabled } from "./geminiClient";
import { formatResponse, CoreResponsePayload } from "./responseFormatter";
import { loadHistory, saveMessage } from "./memoryManager";
import { prisma } from "../../lib/prisma";
import { analyzeGrowth } from "../../agents/growthAgent";

export async function processAiRequest(
  businessId: string,
  question: string
): Promise<CoreResponsePayload> {
  // 1. Classify Intents (Intent Router)
  const intents = await classifyIntent(question);

  // 2. Generate Execution Plan (AI Planner)
  const plan = generateExecutionPlan(intents, question);

  // 3. Execute Actions (Action Engine via Tool Registry)
  const toolExecutions: ToolCallResult[] = [];
  for (const toolCall of plan.toolCalls) {
    const result = await executeAction(businessId, toolCall.toolName, toolCall.input);
    toolExecutions.push(result);
  }

  // 4. Gather Context (Context Manager)
  const rawContext = await gatherContext(businessId, intents, question);

  // Inject tool outputs directly into grounding context for Gemini
  if (toolExecutions.length > 0) {
    rawContext.toolOutputs = toolExecutions.map((t) => ({
      tool: t.toolName,
      success: t.success,
      data: t.output,
      error: t.error,
    }));
  }

  // 5. Rank & Filter Context (Context Ranker)
  const context = rankAndFilterContext(rawContext, question);

  // 6. Load Conversation History (Memory Manager)
  const history = await loadHistory(businessId);

  // 7. Generate Response (Gemini Client)
  if (isGeminiEnabled()) {
    const { system, prompt } = buildPrompt({ context, history, question });
    const rawAnswer = await generateContent({ system, contents: prompt });
    if (rawAnswer) {
      return formatResponse(rawAnswer, intents, "Gemini", toolExecutions);
    }
  }

  // 8. Fallback Rule-Based Engine
  const q = question.toLowerCase();
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const customers = await prisma.customer.findMany({ where: { businessId } });
  const sales = await prisma.sale.findMany({ where: { businessId } });
  const growth = analyzeGrowth(sales, customers);

  let fallbackText = "";

  // Check if a tool execution returned structured outputs we can explain in fallback
  const navigationToolResult = toolExecutions.find((t) => t.toolName === "NavigationTool" && t.success);
  if (navigationToolResult) {
    const pathName =
      navigationToolResult.output.path === "/customers"
        ? "Customer Analytics"
        : navigationToolResult.output.path.replace("/", "");
    fallbackText = `### Short Answer
Navigating you to the ${pathName} panel now.

### Recommended Actions
• **Review this section's charts** to track relevant business updates.
• **Complete dashboard missions** to log fresh parameters regularly.
• **Re-engage slipping contacts** directly from this workflow window.

**Priority:** Low
**Expected Impact:** Smooth workspace navigation and immediate data access.

### Key Takeaway
Use the sidebar options to browse all modules in your growth dashboard.`;
  } else if (q.includes("price") || q.includes("pricing") || q.includes("cost")) {
    const numMatch = q.match(/\b(\d+)\b/);
    const amount = numMatch ? parseInt(numMatch[1], 10) : 500;
    const isIncrease = q.includes("increase") || q.includes("raise") || q.includes("up") || q.includes("add");
    fallbackText = `### Short Answer
Planning to ${isIncrease ? "increase" : "decrease"} prices by ₹${amount.toLocaleString()} is a major lever that directly affects sales velocity and profitability.

### Recommended Actions
• **Review competitor rates** in your local market to avoid overpricing or underpricing.
• **Introduce bundle packages** instead of raising flat rates to soften user friction.
• **Test pricing shifts** with a small, less active customer segment first.

**Priority:** High
**Expected Impact:** Improved profit margins with minimal volume loss.

### Key Takeaway
Offer value bundles to adjust prices safely without alienating current clients.`;
  } else if (q.includes("expand") || q.includes("expansion") || q.includes("scale") || q.includes("branch") || q.includes("franchise") || q.includes("growth")) {
    fallbackText = `### Short Answer
Expanding your business requires strong cash flow reserves, and you should stabilize recurring revenues before launching new locations.

### Recommended Actions
• **Build a cash buffer** equal to 3-6 months of operating expenses.
• **Establish recurring revenue** models, such as annual service contracts.
• **Audit local demand** in the target location to confirm market fit.

**Priority:** Medium
**Expected Impact:** Lower risk scaling and predictable expansion funding.

### Key Takeaway
Secure a steady stream of repeat customer revenue before launching new physical branches.`;
  } else if (q.includes("automate") || q.includes("automation") || q.includes("reminder")) {
    fallbackText = `### Short Answer
Setting up automated messaging templates saves admin time and keeps your customers engaged automatically.

### Recommended Actions
• **Activate automated triggers** for seasonal offers or service renewals.
• **Refine template copy** in your Automation page to sound personal and friendly.
• **Review task check-ins** weekly to track customer response rates.

**Priority:** High
**Expected Impact:** Reduced administrative hours and higher customer lifetime value.

### Key Takeaway
Enable ready-to-use email and message templates to re-engage quiet clients automatically.`;
  } else if (q.includes("employee") && (q.includes("reduce") || q.includes("remove") || q.includes("less") || q.includes("cut") || q.includes("planning to"))) {
    const currentEmployees = business?.employees ? parseInt(business.employees.replace(/[^0-9]/g, ""), 10) : 10;
    const match = q.match(/\b(\d+)\b/);
    const change = match ? parseInt(match[1], 10) : 2;
    const finalCount = isNaN(currentEmployees) ? Math.max(0, 10 - change) : Math.max(0, currentEmployees - change);
    fallbackText = `### Short Answer
Operating with ${finalCount} employees (down from ${isNaN(currentEmployees) ? 10 : currentEmployees}) will lower your monthly payroll expenses.

### Recommended Actions
• **Redistribute key tasks** to ensure critical operations are fully covered.
• **Optimize work schedules** to prevent fatigue and high workload on remaining staff.
• **Set up automated notifications** to handle customer support FAQs without human labor.

**Priority:** Medium
**Expected Impact:** Lower payroll overhead offset by potential service speed limits.

### Key Takeaway
Balance the immediate payroll savings with workload support for your remaining staff.`;
  } else if (q.includes("sales") && (q.includes("increase") || q.includes("up") || q.includes("grow") || q.includes("raise"))) {
    const pctMatch = q.match(/\b(\d+)\b/);
    const pct = pctMatch ? parseInt(pctMatch[1], 10) : 20;
    const currentSalesVal = business?.avgMonthlyRevenue || 500000;
    const increasedVal = currentSalesVal * (1 + pct / 100);
    const difference = increasedVal - currentSalesVal;
    fallbackText = `### Short Answer
A ${pct}% increase in monthly sales would boost your revenue from ₹${currentSalesVal.toLocaleString()} to ₹${increasedVal.toLocaleString()}.

### Recommended Actions
• **Reinvest the extra ₹${difference.toLocaleString()}** in local digital marketing campaigns.
• **Upgrade inventory levels** for popular products to handle increased demand.
• **Offer loyalty perks** to the new clients acquired during this sales spike.

**Priority:** High
**Expected Impact:** Stronger cash reserves and accelerated market growth.

### Key Takeaway
Reinvest the extra ₹${difference.toLocaleString()} revenue directly into customer acquisition to compound growth.`;
  } else if (q.includes("call") || q.includes("reach out") || q.includes("contact")) {
    if (growth.inactiveCustomers.length === 0) {
      fallbackText = `### Short Answer
You have no inactive customers. All registered buyers have made a transaction in the last 60 days.

### Recommended Actions
• **Monitor retention trends** monthly to ensure users stay active.
• **Send a thank-you note** to VIP buyers to maintain customer loyalty.
• **Introduce a referral perk** to encourage word-of-mouth growth.

**Priority:** Low
**Expected Impact:** Constant engagement and improved brand reputation.

### Key Takeaway
Continue delivering excellent service to keep your active customer base happy.`;
    } else {
      const names = growth.inactiveCustomers.slice(0, 3).map((c) => c.name).join(", ");
      fallbackText = `### Short Answer
Reaching out to inactive users like ${names} is the fastest way to generate quick sales.

### Recommended Actions
• **Send a friendly check-in** text to ask for feedback.
• **Offer a small discount** or VIP reward to invite them back.
• **Automate reminder alerts** for clients who haven't visited in 60 days.

**Priority:** High
**Expected Impact:** Reactivated accounts and immediate revenue recovery.

### Key Takeaway
Reach out to ${names} today with a personalized offer to bring them back.`;
    }
  } else {
    // General Informational Fallback
    fallbackText = `### Short Answer
Focus on re-engaging quiet customers who haven't visited your business in over 60 days.

### Recommended Actions
• **Review your automation page** to activate ready-made reminder drafts.
• **Add missing digital details** like Facebook or website links.
• **Record daily sales** regularly to keep your metrics fresh.

**Priority:** Medium
**Expected Impact:** Higher retention rate and predictable month-on-month sales.

### Key Takeaway
Enable automated email templates to reach inactive clients automatically.`;
  }

  return formatResponse(fallbackText, intents, "FallbackRule", toolExecutions);
}

export { saveMessage };
export type { CoreResponsePayload };
export type { IntentType };
