import { Customer } from "@prisma/client";
import { generateGroundedText } from "../services/gemini";

export interface DraftInput {
  type: "whatsapp" | "email" | "reminder" | "task" | "followup";
  customer: Customer;
  businessName: string;
  reason: string;
}

export interface GeneratedDraft {
  subject: string | null;
  content: string;
  reasoning: string;
}

function templateDraft(input: DraftInput): GeneratedDraft {
  const firstName = input.customer.name.split(" ")[0];
  switch (input.type) {
    case "whatsapp":
      return {
        subject: null,
        content: `Hi ${firstName}! 👋 It's been a while since your last visit to ${input.businessName}. We'd love to have you back — is there anything we can help you with, or a new offer you'd like to hear about?`,
        reasoning: input.reason,
      };
    case "email":
      return {
        subject: `We miss you at ${input.businessName}`,
        content: `Hi ${firstName},\n\nWe noticed it's been a while since your last purchase with ${input.businessName}. We'd love to welcome you back — reply to this email and let us know how we can help.\n\nWarm regards,\n${input.businessName}`,
        reasoning: input.reason,
      };
    case "reminder":
      return {
        subject: `Follow up with ${input.customer.name}`,
        content: `Reminder: follow up with ${input.customer.name}. ${input.reason}`,
        reasoning: input.reason,
      };
    case "task":
      return {
        subject: `Task: reconnect with ${input.customer.name}`,
        content: `Reach out to ${input.customer.name} regarding: ${input.reason}`,
        reasoning: input.reason,
      };
    case "followup":
    default:
      return {
        subject: null,
        content: `Hi ${firstName}, just checking in from ${input.businessName} — thank you for being a customer. Let us know if there's anything you need!`,
        reasoning: input.reason,
      };
  }
}

export async function generateAutomationDraft(input: DraftInput): Promise<GeneratedDraft> {
  const base = templateDraft(input);

  const enhanced = await generateGroundedText({
    system:
      "You write short, warm, non-pushy business outreach drafts for a small business owner to review and approve before sending. Never invent facts about the customer beyond what is given. The message content must contain ONLY the actual customer-facing text, without any headers, meta-commentary, notes, or target-audience descriptions.",
    groundingFacts: {
      businessName: input.businessName,
      customerName: input.customer.name,
      channel: input.type,
      reason: input.reason,
      lifetimeValue: input.customer.lifetimeValue,
      lastPurchaseAt: input.customer.lastPurchaseAt,
    },
    instruction:
      input.type === "email"
        ? "Write a short email. Return exactly two lines: line 1 is the subject prefixed with 'SUBJECT:', line 2+ is the body. Do not include any headers like 'Target Audience:' or 'Call To Action:' in the email body."
        : "Write a short, friendly message (2-3 sentences max) for this channel. Return only the message body, nothing else. Do not include any notes, headers, or meta-commentary.",
    maxTokens: 300,
  });

  if (!enhanced) return base;

  if (input.type === "email") {
    const subjectMatch = enhanced.match(/^SUBJECT:\s*(.+)$/m);
    const subject = subjectMatch ? subjectMatch[1].trim() : base.subject;
    const body = enhanced.replace(/^SUBJECT:\s*.+$/m, "").trim();
    return { subject, content: body || base.content, reasoning: base.reasoning };
  }

  return { subject: base.subject, content: enhanced, reasoning: base.reasoning };
}
