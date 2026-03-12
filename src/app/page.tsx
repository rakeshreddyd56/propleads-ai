import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, Globe, Brain, MessageSquare, BarChart3, Shield, ArrowRight } from "lucide-react";
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

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
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
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
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

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold">Ready to Transform Your Lead Pipeline?</h2>
        <p className="mt-3 text-zinc-500">Join real estate teams across Hyderabad using AI to find and convert leads faster.</p>
        <Link href="/sign-up">
          <Button size="lg" className="mt-8 text-lg px-8 py-6">
            Start for Free <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            <span className="font-semibold">PropLeads AI</span>
          </div>
          <p className="text-sm text-zinc-400">Built for Indian Real Estate. Hyderabad-first.</p>
        </div>
      </footer>
    </div>
  );
}
