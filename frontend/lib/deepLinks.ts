import { Customer, AutomationDraft } from "./types";

export interface DeepLinkResult {
  url: string | null;
  channelLabel: string;
  error: string | null;
}

/**
 * Builds standard native communication deep links (WhatsApp, Email, SMS)
 * based on draft content and target customer contact info.
 */
export function getDeepLink(
  draft: Pick<AutomationDraft, "type" | "content" | "subject" | "targetCustomerId">,
  customer?: Pick<Customer, "phone" | "email" | "name"> | null,
  businessName?: string
): DeepLinkResult {
  const type = draft.type.toLowerCase();

  // Determine standard channel label first, regardless of customer targeting
  let channelLabel = "Internal Task";
  if (type === "whatsapp") {
    channelLabel = "WhatsApp";
  } else if (type === "email") {
    channelLabel = "Email client";
  } else if (type === "reminder") {
    if (customer?.email && customer.email.trim()) {
      channelLabel = "Email client";
    } else if (customer?.phone && customer.phone.trim()) {
      channelLabel = "SMS";
    } else {
      channelLabel = "Internal Reminder";
    }
  } else if (type === "followup") {
    channelLabel = "Internal Follow-up";
  }

  // If there is no target customer, it is an internal/general template.
  // We do not require contact verification and do not open any deep links.
  if (!draft.targetCustomerId) {
    return { url: null, channelLabel, error: null };
  }

  // 1. WhatsApp
  if (type === "whatsapp") {
    if (!customer?.phone || !customer.phone.trim()) {
      return {
        url: null,
        channelLabel,
        error: "This customer has no phone number on file — add one on their profile before sending via WhatsApp.",
      };
    }
    // Strip non-digits: strip space, dash, parenthesis, +
    let cleaned = customer.phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      cleaned = "91" + cleaned; // Default prefix for Indian numbers if no country code exists
    }
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(draft.content)}`;
    return { url, channelLabel, error: null };
  }

  // 2. Email
  if (type === "email") {
    if (!customer?.email || !customer.email.trim()) {
      return {
        url: null,
        channelLabel,
        error: "This customer has no email address on file — add one on their profile before sending via Email.",
      };
    }
    const subject = draft.subject || (businessName ? `A message from ${businessName}` : "A message from Nexora");
    const url = `mailto:${customer.email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft.content)}`;
    return { url, channelLabel, error: null };
  }

  // 3. Reminder
  if (type === "reminder") {
    // Treat as Email if customer has email
    if (customer?.email && customer.email.trim()) {
      const subject = draft.subject || (businessName ? `A message from ${businessName}` : "A message from Nexora");
      const url = `mailto:${customer.email.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft.content)}`;
      return { url, channelLabel: "Email client", error: null };
    }
    // Offer SMS if customer has phone but no email
    if (customer?.phone && customer.phone.trim()) {
      let cleaned = customer.phone.replace(/\D/g, "");
      if (cleaned.length === 10) {
        cleaned = "91" + cleaned;
      }
      const url = `sms:${cleaned}?body=${encodeURIComponent(draft.content)}`;
      return { url, channelLabel: "SMS", error: null };
    }
    // Internal reminder (no customer contact details)
    return { url: null, channelLabel: "Internal Reminder", error: null };
  }

  return { url: null, channelLabel, error: null };
}
