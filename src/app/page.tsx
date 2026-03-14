import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, Globe, Brain, MessageSquare, BarChart3, Shield, ArrowRight, Check, X } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const features = [
  { icon: Globe, title: "AI Lead Scraping", desc: "Automatically find property seekers on Reddit, Facebook, forums, and real estate portals across Hyderabad" },
  { icon: Brain, title: "Intent Detection", desc: "AI analyzes posts to extract budget, preferred areas, property type, and buyer persona" },
  { icon: Zap, title: "Smart Matching", desc: "Match leads to your properties using AI scoring — budget fit, location match, and persona alignment" },
  { icon: MessageSquare, title: "Conversation Coach", desc: "Get culturally-aware sales coaching tailored to Hyderabad buyers — Telugu rapport, Vastu, RERA" },
  { icon: Shield, title: "Compliant Outreach", desc: "DPDP Act compliant WhatsApp and email outreach with opt-in verification and DND checks" },
  { icon: BarChart3, title: "Analytics & ROI", desc: "Track conversion funnels, source performance, and cost per lead across all channels" },
];

const steps = [
  { num: "1", title: "Upload Properties", desc: "Upload brochures — AI extracts all details automatically" },
  { num: "2", title: "Configure Sources", desc: "Set up Reddit, Facebook, and portal scraping with keywords" },
  { num: "3", title: "AI Finds Leads", desc: "Our AI scrapes, detects intent, and scores every lead" },
  { num: "4", title: "Match & Reach Out", desc: "Get matched properties and AI-crafted outreach messages" },
];

const plans = [
  {
    name: "Free", price: "₹0", period: "", tagline: "Get started with lead discovery",
    features: ["Reddit monitoring", "50 leads/month", "2 runs/day", "AI intent detection", "Manual scoring"],
    excluded: ["Property portals", "Social media", "Auto-scoring", "Hot lead alerts"],
    cta: "Start Free", highlighted: false,
  },
  {
    name: "Starter", price: "₹375", period: "/mo", tagline: "For brokers & small agents",
    features: ["Everything in Free", "99acres, MagicBricks, NoBroker", "Facebook & CommonFloor", "200 leads/month", "5 runs/day"],
    excluded: ["Social media", "Auto-scoring", "Hot lead alerts"],
    cta: "Get Started", highlighted: false,
  },
  {
    name: "Growth", price: "₹1,750", period: "/mo", tagline: "For mid-size builders",
    features: ["Everything in Starter", "Instagram, Twitter, YouTube", "LinkedIn, Quora, Telegram", "500 leads/month", "10 runs/day", "Auto-scoring", "AI property matching", "Hot lead alerts (Slack/Email)"],
    excluded: ["Contact enrichment", "Daily digest"],
    cta: "Upgrade to Growth", highlighted: true,
  },
  {
    name: "Pro", price: "₹3,000", period: "/mo", tagline: "For large builders & enterprises",
    features: ["Everything in Growth", "Contact enrichment (email, phone)", "Cross-platform dedup", "Unlimited leads", "Unlimited runs", "Daily lead digest", "Priority support"],
    excluded: [],
    cta: "Go Pro", highlighted: false,
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-bold tracking-tight">PropLeads AI</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-600">
            <a href="#features" className="hover:text-zinc-900">Features</a>
            <a href="#pricing" className="hover:text-zinc-900">Pricing</a>
            <Link href="/sign-in" className="hover:text-zinc-900">Sign In</Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </nav>
          <div className="sm:hidden flex gap-2">
            <Link href="/sign-in" className="text-sm text-zinc-600">Sign In</Link>
            <Link href="/sign-up"><Button size="sm">Sign Up</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm shadow-sm dark:bg-zinc-900 mb-6">
            <Zap className="h-4 w-4 text-orange-500" />
            <span>AI-Powered Lead Intelligence for Hyderabad Real Estate</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight lg:text-6xl">
            Find Your Next Buyer
            <br />
            <span className="text-orange-500">Before They Find You</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            PropLeads AI scrapes the web, detects property-seeking intent, matches leads to your listings,
            and coaches your sales team — all in one platform built for Indian real estate.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Sign In
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-zinc-500">No credit card required. Free plan includes 50 leads/month.</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold">Everything Your Sales Team Needs</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-500">One platform to find, qualify, match, and convert real estate leads in Hyderabad</p>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border p-6 transition-shadow hover:shadow-lg">
              <f.icon className="h-10 w-10 text-orange-500" />
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50 dark:bg-zinc-900 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold">How It Works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-xl font-bold text-white">
                  {s.num}
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold">Simple, Transparent Pricing</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-zinc-500">
          One converted lead on a 1Cr property = 2-3L commission. PropLeads pays for itself with a single deal.
        </p>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted ? "border-orange-500 ring-2 ring-orange-500 relative" : "border-zinc-200"
              }`}>
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">{plan.tagline}</p>
              </div>
              <div className="mb-5">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-bold text-zinc-900">{plan.price}</span>
                  {plan.period && <span className="text-sm text-zinc-500">{plan.period}</span>}
                </div>
                {plan.price !== "₹0" && (
                  <p className="text-xs text-green-600 mt-1">Save 20% with annual billing</p>
                )}
              </div>
              <Link href="/sign-up"
                className={`block w-full text-center rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  plan.highlighted ? "bg-orange-500 text-white hover:bg-orange-600" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                }`}>
                {plan.cta}
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
          ))}
        </div>
        <p className="text-center text-sm text-zinc-500 mt-8">
          All plans include AI intent detection, property brochure upload, lead management, and AI conversation coach.
          <br />Payments via Razorpay — UPI, cards, net banking, wallets accepted.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-zinc-900 dark:bg-zinc-800 py-20 text-center">
        <h2 className="text-3xl font-bold text-white">Ready to Transform Your Lead Pipeline?</h2>
        <p className="mt-3 text-zinc-400">Join real estate teams across Hyderabad using AI to find and convert leads faster.</p>
        <Link href="/sign-up">
          <Button size="lg" className="mt-8 text-lg px-8 py-6 bg-orange-500 hover:bg-orange-600">
            Start for Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span className="font-semibold">PropLeads AI</span>
          </div>
          <div className="flex gap-6 text-sm text-zinc-500">
            <Link href="/pricing" className="hover:text-zinc-700">Pricing</Link>
            <Link href="/sign-in" className="hover:text-zinc-700">Sign In</Link>
            <Link href="/sign-up" className="hover:text-zinc-700">Sign Up</Link>
          </div>
          <p className="text-sm text-zinc-400">Built for Indian Real Estate. Hyderabad-first.</p>
        </div>
      </footer>
    </div>
  );
}
