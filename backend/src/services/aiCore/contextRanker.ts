export function rankAndFilterContext(
  context: Record<string, any>,
  question: string
): Record<string, any> {
  const q = question.toLowerCase();
  const rankedContext: Record<string, any> = {};

  // 1. Core Profile & Memory always remain highest priority (never filtered)
  if (context.businessProfile) rankedContext.businessProfile = context.businessProfile;
  if (context.conversationMemory) rankedContext.conversationMemory = context.conversationMemory;

  // 2. Score optional context blocks based on query keyword alignment
  const optionalBlocks: { key: string; score: number; data: any }[] = [];

  for (const [key, data] of Object.entries(context)) {
    if (key === "businessProfile" || key === "conversationMemory") continue;

    let score = 0;
    const lowerKey = key.toLowerCase();

    // Key match scoring
    if (lowerKey.includes("analytic") && (q.includes("customer") || q.includes("analytic") || q.includes("sales"))) score += 5;
    if (lowerKey.includes("dashboard") && (q.includes("dashboard") || q.includes("readiness") || q.includes("confidence"))) score += 5;
    if (lowerKey.includes("mission") && (q.includes("mission") || q.includes("task") || q.includes("todo"))) score += 5;
    if (lowerKey.includes("insight") && (q.includes("insight") || q.includes("narrative") || q.includes("story"))) score += 5;
    if (lowerKey.includes("automation") && (q.includes("automate") || q.includes("template") || q.includes("whatsapp"))) score += 5;
    if (lowerKey.includes("website") && (q.includes("website") || q.includes("link") || q.includes("seo"))) score += 5;
    if (lowerKey.includes("knowledge") && (q.includes("help") || q.includes("what is") || q.includes("explain"))) score += 5;

    // Content text matching
    const contentString = JSON.stringify(data).toLowerCase();
    const keywords = q.split(/\s+/).filter(w => w.length > 3);
    for (const word of keywords) {
      if (contentString.includes(word)) {
        score += 1;
      }
    }

    optionalBlocks.push({ key, score, data });
  }

  // 3. Sort optional blocks by score descending
  optionalBlocks.sort((a, b) => b.score - a.score);

  // 4. Inject only the top 3 optional blocks to optimize token usage
  const topBlocks = optionalBlocks.slice(0, 3);
  for (const block of topBlocks) {
    rankedContext[block.key] = block.data;
  }

  return rankedContext;
}
