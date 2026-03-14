import { NextResponse } from "next/server";
import { resolveOrg } from "@/lib/auth";
import { seedRazorpayPlans, validateConfig } from "@/lib/razorpay";

/**
 * POST /api/razorpay/plans/seed
 *
 * One-time setup: Creates all 6 paid plans on Razorpay.
 *
 * Requires admin access. Returns the plan IDs to store
 * as environment variables.
 *
 * After running this, add the returned plan IDs to .env:
 *   RAZORPAY_PLAN_STARTER_MONTHLY=plan_XXXXX
 *   RAZORPAY_PLAN_STARTER_ANNUAL=plan_XXXXX
 *   RAZORPAY_PLAN_GROWTH_MONTHLY=plan_XXXXX
 *   RAZORPAY_PLAN_GROWTH_ANNUAL=plan_XXXXX
 *   RAZORPAY_PLAN_PRO_MONTHLY=plan_XXXXX
 *   RAZORPAY_PLAN_PRO_ANNUAL=plan_XXXXX
 */
export async function POST() {
  const orgId = await resolveOrg();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Validate Razorpay configuration
  const config = validateConfig();
  if (!config.valid) {
    return NextResponse.json(
      {
        error: "Missing Razorpay configuration",
        missing: config.missing,
        hint: "Add RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET to .env",
      },
      { status: 500 },
    );
  }

  try {
    const plans = await seedRazorpayPlans();

    return NextResponse.json({
      success: true,
      message:
        "Plans created successfully. Add the following to your .env file:",
      plans,
      envLines: plans.map((p) => `${p.envKey}=${p.razorpayPlanId}`),
    });
  } catch (error) {
    console.error("Failed to seed Razorpay plans:", error);
    return NextResponse.json(
      {
        error: "Failed to create plans on Razorpay",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
