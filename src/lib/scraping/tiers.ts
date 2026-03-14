export type PlanTier = "FREE" | "STARTER" | "GROWTH" | "PRO";

export const TIER_PLATFORMS: Record<PlanTier, string[]> = {
  FREE: ["REDDIT"],
  STARTER: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
  ],
  GROWTH: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
    "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM",
    "GOOGLE_MAPS",
  ],
  PRO: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
    "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM",
    "GOOGLE_MAPS",
  ],
};

export const TIER_RUNS_PER_DAY: Record<PlanTier, number> = {
  FREE: 2, STARTER: 5, GROWTH: 10, PRO: 999,
};

export const TIER_FEATURES: Record<PlanTier, string[]> = {
  FREE: ["intent_detection", "manual_score"],
  STARTER: ["intent_detection", "manual_score"],
  GROWTH: [
    "intent_detection", "manual_score", "auto_score",
    "notifications", "ai_matching", "serpapi_search",
  ],
  PRO: [
    "intent_detection", "manual_score", "auto_score",
    "notifications", "ai_matching", "serpapi_search",
    "cross_platform_dedup", "contact_enrichment", "daily_digest",
  ],
};

export const TIER_LEADS_PER_MONTH: Record<PlanTier, number> = {
  FREE: 50, STARTER: 200, GROWTH: 500, PRO: 9999,
};

// Prices are in paise (1/100 of INR). Divide by 100 for display.
export const PLAN_PRICING = {
  FREE: { monthly: 0, annual: 0, name: "Free", tagline: "Get started with lead discovery" },
  STARTER: { monthly: 37500, annual: 30000, name: "Starter", tagline: "For brokers & small agents" },
  GROWTH: { monthly: 175000, annual: 140000, name: "Growth", tagline: "For mid-size builders" },
  PRO: { monthly: 300000, annual: 240000, name: "Pro", tagline: "For large builders & enterprises" },
} as const;

export function isPlatformAllowed(tier: PlanTier, platform: string): boolean {
  return TIER_PLATFORMS[tier].includes(platform);
}

export function hasFeature(tier: PlanTier, feature: string): boolean {
  return TIER_FEATURES[tier].includes(feature);
}

export function canRunToday(tier: PlanTier, runsToday: number): boolean {
  return runsToday < TIER_RUNS_PER_DAY[tier];
}

export function getRequiredTier(platform: string): string {
  if (["REDDIT"].includes(platform)) return "Free";
  if (["NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "FACEBOOK", "COMMONFLOOR"].includes(platform))
    return "Starter";
  return "Growth";
}

export function canCreateLead(tier: PlanTier, leadsThisMonth: number): boolean {
  return leadsThisMonth < TIER_LEADS_PER_MONTH[tier];
}
