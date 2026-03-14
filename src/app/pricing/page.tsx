"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, Zap, Shield, Rocket, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    tier: "FREE", name: "Free", icon: Shield, tagline: "Get started with lead discovery",
    monthly: 0, annual: 0,
    limits: { platforms: 1, runsPerDay: 2, leadsPerMonth: 50 },
    features: [
      "Reddit monitoring",
      "AI intent detection",
      "Manual lead scoring",
      "Property brochure upload",
      "AI conversation coach",
      "Lead management dashboard",
    ],
    excluded: [
      "Property portal scraping (99acres, MagicBricks, NoBroker)",
      "Social media scraping (Instagram, LinkedIn, Twitter)",
      "Auto-scoring on scrape",
      "AI property matching",
      "Hot lead alerts (Slack/Email)",
      "Contact enrichment (email, phone)",
      "Cross-platform lead dedup",
      "Daily lead digest",
    ],
    cta: "Start Free", highlighted: false,
  },
  {
    tier: "STARTER", name: "Starter", icon: Zap, tagline: "For brokers & small agents",
    monthly: 37500, annual: 30000,
    limits: { platforms: 6, runsPerDay: 5, leadsPerMonth: 200 },
    features: [
      "Everything in Free",
      "99acres, MagicBricks, NoBroker",
      "Facebook Groups",
      "CommonFloor forums",
      "AI intent detection",
      "Manual lead scoring",
      "Property brochure upload",
      "AI conversation coach",
    ],
    excluded: [
      "Social media scraping (Instagram, LinkedIn, Twitter)",
      "Auto-scoring on scrape",
      "AI property matching",
      "Hot lead alerts (Slack/Email)",
      "Contact enrichment",
      "Cross-platform dedup",
      "Daily lead digest",
    ],
    cta: "Get Started", highlighted: false,
  },
  {
    tier: "GROWTH", name: "Growth", icon: Rocket, tagline: "For mid-size builders",
    monthly: 175000, annual: 140000,
    limits: { platforms: 13, runsPerDay: 10, leadsPerMonth: 500 },
    features: [
      "Everything in Starter",
      "Instagram, Twitter/X, YouTube",
      "LinkedIn, Quora, Telegram",
      "Google Maps listings",
      "Auto-score on scrape",
      "AI-powered property matching",
      "Hot lead alerts (Slack + Email)",
      "Real-time search via SerpAPI",
      "Analytics & funnel tracking",
    ],
    excluded: [
      "Contact enrichment (email, phone)",
      "Cross-platform lead dedup",
      "Daily lead digest",
    ],
    cta: "Upgrade to Growth", highlighted: true,
  },
  {
    tier: "PRO", name: "Pro", icon: Crown, tagline: "For large builders & enterprises",
    monthly: 300000, annual: 240000,
    limits: { platforms: 13, runsPerDay: -1, leadsPerMonth: -1 },
    features: [
      "Everything in Growth",
      "Contact enrichment (email, phone, company)",
      "Cross-platform lead dedup",
      "Daily lead digest email",
      "Social graph analysis",
      "Deep scraping mode",
      "Priority support",
      "Unlimited runs & leads",
    ],
    excluded: [],
    cta: "Go Pro", highlighted: false,
  },
];

function formatPrice(paise: number) {
  if (paise === 0) return "Free";
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-bold tracking-tight">PropLeads AI</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-zinc-600 hover:text-zinc-900">Sign In</Link>
            <Link href="/sign-up" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-6 pt-16 pb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Simple, Transparent Pricing
        </h1>
        <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
          AI-powered lead discovery across 13+ platforms. Every lead is intent-verified
          and matched to your property inventory.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          One converted lead on a 1Cr property = 2-3L commission. PropLeads pays for itself with a single deal.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 pb-10">
        <button
          onClick={() => setBilling("monthly")}
          className={cn(
            "rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
            billing === "monthly" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          )}>
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={cn(
            "rounded-lg px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2",
            billing === "annual" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          )}>
          Annual
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-semibold",
            billing === "annual" ? "bg-green-400 text-green-950" : "bg-green-100 text-green-700"
          )}>Save 20%</span>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = billing === "annual" ? plan.annual : plan.monthly;

            return (
              <div key={plan.tier}
                className={cn(
                  "rounded-2xl border p-6 flex flex-col relative",
                  plan.highlighted ? "border-orange-500 ring-2 ring-orange-500" : "border-zinc-200"
                )}>
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}

                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-5 w-5", plan.highlighted ? "text-orange-500" : "text-zinc-600")} />
                  <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 mb-4">{plan.tagline}</p>

                <div className="mb-5">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-bold text-zinc-900">{formatPrice(price)}</span>
                    {price > 0 && <span className="text-sm text-zinc-500">/mo</span>}
                  </div>
                  {price > 0 && billing === "annual" && (
                    <p className="text-xs text-green-600 mt-1">
                      Billed annually ({formatPrice(price * 12)}/yr)
                    </p>
                  )}
                  {price > 0 && billing === "monthly" && (
                    <p className="text-xs text-green-600 mt-1">
                      or {formatPrice(plan.annual)}/mo billed annually
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div className="rounded-lg bg-zinc-50 p-3 mb-5 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Platforms</span>
                    <span className="font-medium">{plan.limits.platforms}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Runs/day</span>
                    <span className="font-medium">{plan.limits.runsPerDay === -1 ? "Unlimited" : plan.limits.runsPerDay}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Leads/month</span>
                    <span className="font-medium">{plan.limits.leadsPerMonth === -1 ? "Unlimited" : plan.limits.leadsPerMonth}</span>
                  </div>
                </div>

                <Link href="/sign-up"
                  className={cn(
                    "block w-full text-center rounded-lg py-2.5 text-sm font-medium transition-colors",
                    plan.highlighted
                      ? "bg-orange-500 text-white hover:bg-orange-600"
                      : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                  )}>
                  {plan.cta} <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
                </Link>

                <div className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /><span>{f}</span>
                    </div>
                  ))}
                  {plan.excluded.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                      <X className="h-4 w-4 mt-0.5 shrink-0" /><span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Detailed Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2">
                <th className="text-left py-3 pr-4 font-medium text-zinc-500">Feature</th>
                <th className="text-center py-3 px-4 font-semibold">Free</th>
                <th className="text-center py-3 px-4 font-semibold">Starter</th>
                <th className="text-center py-3 px-4 font-semibold text-orange-600">Growth</th>
                <th className="text-center py-3 px-4 font-semibold">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { feature: "Monthly Price", values: ["₹0", "₹375", "₹1,750", "₹3,000"] },
                { feature: "Leads per Month", values: ["50", "200", "500", "Unlimited"] },
                { feature: "Runs per Day", values: ["2", "5", "10", "Unlimited"] },
                { feature: "Platforms", values: ["1", "6", "13", "13"] },
                { feature: "Reddit", values: [true, true, true, true] },
                { feature: "99acres / MagicBricks / NoBroker", values: [false, true, true, true] },
                { feature: "Facebook / CommonFloor", values: [false, true, true, true] },
                { feature: "Instagram / Twitter / YouTube", values: [false, false, true, true] },
                { feature: "LinkedIn / Quora / Telegram", values: [false, false, true, true] },
                { feature: "Google Maps Listings", values: [false, false, true, true] },
                { feature: "AI Intent Detection", values: [true, true, true, true] },
                { feature: "Property Brochure Upload (AI)", values: [true, true, true, true] },
                { feature: "AI Conversation Coach", values: [true, true, true, true] },
                { feature: "Lead Management", values: [true, true, true, true] },
                { feature: "Manual Scoring & Matching", values: [true, true, true, true] },
                { feature: "Auto-Score on Scrape", values: [false, false, true, true] },
                { feature: "AI Property Matching", values: [false, false, true, true] },
                { feature: "Hot Lead Alerts (Slack + Email)", values: [false, false, true, true] },
                { feature: "Analytics & Funnel Tracking", values: [true, true, true, true] },
                { feature: "Contact Enrichment (Email/Phone)", values: [false, false, false, true] },
                { feature: "Cross-Platform Lead Dedup", values: [false, false, false, true] },
                { feature: "Daily Lead Digest Email", values: [false, false, false, true] },
              ].map((row) => (
                <tr key={row.feature} className="hover:bg-zinc-50">
                  <td className="py-2.5 pr-4 text-zinc-700 font-medium">{row.feature}</td>
                  {row.values.map((val, i) => (
                    <td key={i} className="py-2.5 px-4 text-center">
                      {typeof val === "boolean" ? (
                        val ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-zinc-300 mx-auto" />
                      ) : (
                        <span className={cn("font-medium", i === 2 && "text-orange-600")}>{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "How does the free plan work?", a: "Sign up and start immediately — no credit card needed. You get Reddit monitoring, 50 leads/month, AI intent detection, and full access to the dashboard. Upgrade anytime when you need more platforms or leads." },
              { q: "What payment methods are accepted?", a: "We use Razorpay, so you can pay via UPI, credit/debit cards, net banking, and digital wallets. Annual plans are billed upfront with a 20% discount." },
              { q: "Can I switch plans anytime?", a: "Yes. Upgrade or downgrade anytime from your Settings page. Upgrades take effect immediately. Downgrades apply at the end of your current billing cycle." },
              { q: "What counts as a 'lead'?", a: "A lead is a person our AI identifies as having property-buying intent from one of your configured sources. Each unique person counts as one lead, even if found on multiple platforms (Pro plan deduplicates across platforms)." },
              { q: "What counts as a 'run'?", a: "A run is one scraping pass across all your active sources. You can trigger runs manually or they run automatically via daily cron at 6 AM UTC." },
              { q: "Is my data secure?", a: "Yes. All data is org-scoped and encrypted in transit. We follow DPDP Act 2023 compliance for all outreach. TRAI DND status is verified before SMS." },
            ].map((faq) => (
              <div key={faq.q}>
                <h3 className="font-semibold text-zinc-900">{faq.q}</h3>
                <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span className="font-semibold">PropLeads AI</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-700">Home</Link>
            <Link href="/sign-in" className="hover:text-zinc-700">Sign In</Link>
            <Link href="/sign-up" className="hover:text-zinc-700">Sign Up</Link>
          </div>
          <p className="text-sm text-zinc-400">Built for Indian Real Estate.</p>
        </div>
      </footer>
    </div>
  );
}
