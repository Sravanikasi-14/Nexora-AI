export type IntentType =
  | "Dashboard"
  | "Customer Analytics"
  | "Growth Missions"
  | "Insights"
  | "Automation"
  | "Reports"
  | "Website Analysis"
  | "Marketing"
  | "SEO"
  | "Business Advice"
  | "Application Help"
  | "Conversation"
  | "Unknown";

export async function classifyIntent(question: string): Promise<IntentType[]> {
  const q = question.toLowerCase();
  const intents: IntentType[] = [];

  // Fallback Keyword-Based Classifier (highly reliable, instant response)
  if (q.includes("dashboard") || q.includes("readiness") || q.includes("confidence") || q.includes("home")) {
    intents.push("Dashboard");
  }
  if (q.includes("customer") || q.includes("analytics") || q.includes("segment") || q.includes("clv") || q.includes("lifetime value")) {
    intents.push("Customer Analytics");
  }
  if (q.includes("mission") || q.includes("tasks") || q.includes("todo") || q.includes("action item")) {
    intents.push("Growth Missions");
  }
  if (q.includes("insight") || q.includes("narrative") || q.includes("story") || q.includes("trends")) {
    intents.push("Insights");
  }
  if (q.includes("automate") || q.includes("automation") || q.includes("template") || q.includes("reminder") || q.includes("whatsapp") || q.includes("email")) {
    intents.push("Automation");
  }
  if (q.includes("report") || q.includes("ledgers") || q.includes("upload") || q.includes("csv")) {
    intents.push("Reports");
  }
  if (q.includes("website") || q.includes("link") || q.includes("url") || q.includes("digital maturity")) {
    intents.push("Website Analysis");
  }
  if (q.includes("market") || q.includes("marketing") || q.includes("promote") || q.includes("advertise") || q.includes("ads")) {
    intents.push("Marketing");
  }
  if (q.includes("seo") || q.includes("google search") || q.includes("visibility") || q.includes("ranking")) {
    intents.push("SEO");
  }
  if (q.includes("grow") || q.includes("advice") || q.includes("expand") || q.includes("scale") || q.includes("employee") || q.includes("price") || q.includes("revenue")) {
    intents.push("Business Advice");
  }
  if (q.includes("what is") || q.includes("how to") || q.includes("features") || q.includes("navigation") || q.includes("explain")) {
    intents.push("Application Help");
  }
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("who are you") || q.includes("nexora")) {
    intents.push("Conversation");
  }

  // If no keyword matches, default to Unknown
  if (intents.length === 0) {
    intents.push("Unknown");
  }

  return Array.from(new Set(intents));
}
