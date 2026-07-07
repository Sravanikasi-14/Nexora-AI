import { Business } from "@prisma/client";

export interface DigitalPresenceChannel {
  channel: string;
  present: boolean;
  value: string | null;
  whyItMatters: string;
}

export interface DigitalPresenceReport {
  maturityScore: number; // 0-100
  channels: DigitalPresenceChannel[];
  missingChannels: string[];
  recommendation: string;
}

const CHANNEL_DEFS: { key: keyof Business; label: string; why: string }[] = [
  {
    key: "googleBusiness",
    label: "Google Business Profile",
    why: "It's usually the first thing a local customer sees when they search for you and directly affects local search ranking and trust.",
  },
  {
    key: "website",
    label: "Website",
    why: "A website is the one channel you fully control — it's where paid ads, referrals, and search traffic can convert into customers.",
  },
  {
    key: "instagram",
    label: "Instagram",
    why: "Instagram drives discovery and repeat engagement, especially for visual products and local audiences.",
  },
  {
    key: "facebook",
    label: "Facebook",
    why: "Facebook is still heavily used for local business discovery, reviews, and community trust in many markets.",
  },
  {
    key: "whatsappBiz",
    label: "WhatsApp Business",
    why: "WhatsApp is often the highest-converting direct channel for SMBs — it's where real customer conversations already happen.",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    why: "LinkedIn matters most for B2B credibility, hiring, and partnership visibility.",
  },
];

export function analyzeDigitalPresence(business: Business): DigitalPresenceReport {
  const channels: DigitalPresenceChannel[] = CHANNEL_DEFS.map((def) => {
    const raw = business[def.key] as string | null;
    return {
      channel: def.label,
      present: !!raw,
      value: raw || null,
      whyItMatters: def.why,
    };
  });

  const presentCount = channels.filter((c) => c.present).length;
  const maturityScore = Math.round((presentCount / channels.length) * 100);
  const missingChannels = channels.filter((c) => !c.present).map((c) => c.channel);

  let recommendation: string;
  if (presentCount === 0) {
    recommendation =
      "No digital presence detected. Before any growth strategy, create at minimum a Google Business Profile — it is free, takes under 15 minutes, and is the highest-leverage first step for local discovery.";
  } else if (maturityScore < 50) {
    recommendation = `Digital presence is partial (${presentCount}/${channels.length} channels). Prioritize filling in ${missingChannels[0]} next, since it is currently your biggest visibility gap.`;
  } else {
    recommendation =
      "Digital presence is reasonably established. Focus shifts from creating channels to improving consistency and engagement on the ones you already have.";
  }

  return { maturityScore, channels, missingChannels, recommendation };
}
