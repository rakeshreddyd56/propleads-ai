/**
 * Razorpay Plan Definitions for PropLeads
 *
 * Maps our internal PlanTier + billing cycle to Razorpay plan IDs.
 *
 * IMPORTANT: After running seedRazorpayPlans(), store the returned plan IDs
 * in your database or environment variables. Razorpay plans are immutable
 * once created -- you cannot update them, only create new ones.
 *
 * The FREE tier has no Razorpay plan (no payment needed).
 */

import { createPlan, type RazorpayPlan } from "./client";
import { PLAN_PRICING, type PlanTier } from "@/lib/scraping/tiers";

// ---------------------------------------------------------------------------
// Plan configuration
// ---------------------------------------------------------------------------

export interface PlanConfig {
  tier: PlanTier;
  billingCycle: "monthly" | "annual";
  razorpayPeriod: "monthly" | "yearly";
  amount: number; // in paise
  name: string;
  description: string;
  totalCount: number; // total billing cycles (12 for monthly, 5 for annual)
}

/**
 * All paid plan configurations. FREE tier is excluded because it
 * doesn't require payment processing.
 */
export const PLAN_CONFIGS: PlanConfig[] = [
  // STARTER
  {
    tier: "STARTER",
    billingCycle: "monthly",
    razorpayPeriod: "monthly",
    amount: PLAN_PRICING.STARTER.monthly, // 37500 paise = Rs 375
    name: "Starter Monthly",
    description:
      "PropLeads Starter - For brokers & small agents. 6 platforms, 5 runs/day, 200 leads/month.",
    totalCount: 60, // 5 years of monthly billing
  },
  {
    tier: "STARTER",
    billingCycle: "annual",
    razorpayPeriod: "yearly",
    amount: PLAN_PRICING.STARTER.annual * 12, // 30000 * 12 = 360000 paise = Rs 3,600/year
    name: "Starter Annual",
    description:
      "PropLeads Starter Annual - For brokers & small agents. Save 20%. 6 platforms, 5 runs/day, 200 leads/month.",
    totalCount: 5, // 5 years of annual billing
  },

  // GROWTH
  {
    tier: "GROWTH",
    billingCycle: "monthly",
    razorpayPeriod: "monthly",
    amount: PLAN_PRICING.GROWTH.monthly, // 175000 paise = Rs 1,750
    name: "Growth Monthly",
    description:
      "PropLeads Growth - For mid-size builders. 13 platforms, 10 runs/day, 500 leads/month, AI scoring.",
    totalCount: 60,
  },
  {
    tier: "GROWTH",
    billingCycle: "annual",
    razorpayPeriod: "yearly",
    amount: PLAN_PRICING.GROWTH.annual * 12, // 140000 * 12 = 1680000 paise = Rs 16,800/year
    name: "Growth Annual",
    description:
      "PropLeads Growth Annual - For mid-size builders. Save 20%. 13 platforms, 10 runs/day, 500 leads/month.",
    totalCount: 5,
  },

  // PRO
  {
    tier: "PRO",
    billingCycle: "monthly",
    razorpayPeriod: "monthly",
    amount: PLAN_PRICING.PRO.monthly, // 300000 paise = Rs 3,000
    name: "Pro Monthly",
    description:
      "PropLeads Pro - For large builders & enterprises. All platforms, unlimited runs, 9999 leads/month.",
    totalCount: 60,
  },
  {
    tier: "PRO",
    billingCycle: "annual",
    razorpayPeriod: "yearly",
    amount: PLAN_PRICING.PRO.annual * 12, // 240000 * 12 = 2880000 paise = Rs 28,800/year
    name: "Pro Annual",
    description:
      "PropLeads Pro Annual - For large builders & enterprises. Save 20%. All platforms, unlimited runs.",
    totalCount: 5,
  },
];

// ---------------------------------------------------------------------------
// Plan ID mapping
// ---------------------------------------------------------------------------

/**
 * After seeding plans, store the Razorpay plan IDs. This map is keyed
 * by "TIER_CYCLE" (e.g., "STARTER_monthly", "PRO_annual").
 *
 * In production, these should come from environment variables or database:
 *   RAZORPAY_PLAN_STARTER_MONTHLY=plan_XXXXX
 *   RAZORPAY_PLAN_STARTER_ANNUAL=plan_XXXXX
 *   etc.
 */
export function getRazorpayPlanId(
  tier: PlanTier,
  billingCycle: "monthly" | "annual",
): string | null {
  if (tier === "FREE") return null;

  const envKey = `RAZORPAY_PLAN_${tier}_${billingCycle.toUpperCase()}`;
  const planId = process.env[envKey];

  if (!planId) {
    throw new Error(
      `Missing Razorpay plan ID for ${tier} ${billingCycle}. ` +
        `Set the ${envKey} environment variable. ` +
        `Run the seed script first: POST /api/razorpay/plans/seed`,
    );
  }

  return planId;
}

// ---------------------------------------------------------------------------
// Seed all plans to Razorpay
// ---------------------------------------------------------------------------

export interface SeededPlan {
  tier: PlanTier;
  billingCycle: string;
  razorpayPlanId: string;
  envKey: string;
  amount: number;
  period: string;
}

/**
 * Create all 6 paid plans on Razorpay.
 *
 * Call this ONCE to set up plans. Plans are immutable on Razorpay,
 * so you only need to create them once.
 *
 * Returns the plan IDs that you should store as environment variables.
 *
 * @example
 * const plans = await seedRazorpayPlans();
 * // plans = [
 * //   { tier: "STARTER", billingCycle: "monthly", razorpayPlanId: "plan_XXXXX", envKey: "RAZORPAY_PLAN_STARTER_MONTHLY", ... },
 * //   ...
 * // ]
 * // Add to .env:
 * //   RAZORPAY_PLAN_STARTER_MONTHLY=plan_XXXXX
 * //   RAZORPAY_PLAN_STARTER_ANNUAL=plan_XXXXX
 * //   etc.
 */
export async function seedRazorpayPlans(): Promise<SeededPlan[]> {
  const results: SeededPlan[] = [];

  for (const config of PLAN_CONFIGS) {
    const plan: RazorpayPlan = await createPlan({
      period: config.razorpayPeriod,
      interval: 1,
      item: {
        name: config.name,
        amount: config.amount,
        currency: "INR",
        description: config.description,
      },
      notes: {
        tier: config.tier,
        billing_cycle: config.billingCycle,
        app: "propleads",
      },
    });

    const envKey = `RAZORPAY_PLAN_${config.tier}_${config.billingCycle.toUpperCase()}`;

    results.push({
      tier: config.tier,
      billingCycle: config.billingCycle,
      razorpayPlanId: plan.id,
      envKey,
      amount: config.amount,
      period: config.razorpayPeriod,
    });
  }

  return results;
}
