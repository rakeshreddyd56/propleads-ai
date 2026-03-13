"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Globe,
  Brain,
  MessageSquare,
  BarChart3,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from "lucide-react";

const tourSteps = [
  {
    icon: Upload,
    title: "Upload Properties",
    description:
      "Start by uploading your property brochures (PDF/images). Our AI extracts all details — builder name, unit types, pricing, amenities, RERA numbers — in seconds. No manual data entry needed.",
    action: "Go to Properties",
    href: "/properties",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Globe,
    title: "Configure Lead Sources",
    description:
      "Set up where to find leads. We monitor 13+ platforms: Reddit, Facebook Groups, 99acres, MagicBricks, NoBroker, Instagram, LinkedIn, YouTube, Quora, Twitter, Google Maps, Telegram, and CommonFloor. Reddit works instantly — no API keys needed.",
    action: "Go to Sources",
    href: "/scraping",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Brain,
    title: "AI Finds & Qualifies Leads",
    description:
      "Our AI reads every post across your configured sources and detects property-buying intent. It extracts budget, preferred areas, property type, timeline, and buyer persona (IT pro, NRI, first-time buyer, investor). Only qualified leads make it to your pipeline.",
    action: "View Leads",
    href: "/leads",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Sparkles,
    title: "Smart Lead-Property Matching",
    description:
      "Each lead is automatically matched against your property inventory. The AI scores compatibility based on budget fit, area preference, property type match, and buyer persona. Click any lead to see their best property matches with detailed reasoning.",
    action: "View Matches",
    href: "/leads",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: MessageSquare,
    title: "Personalized Outreach",
    description:
      "Generate culturally-aware, persona-specific outreach messages. Our templates handle IT professionals, NRIs, first-time buyers differently — with Vastu mentions, rental yield data, or loan guidance as appropriate. WhatsApp and Email supported.",
    action: "Outreach Center",
    href: "/outreach",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: GraduationCap,
    title: "AI Sales Coach",
    description:
      "Paste any conversation with a lead and get AI-powered coaching: objection handling, next-step suggestions, and sentiment analysis. The coach understands Hyderabad's real estate market, Telugu cultural nuances, RERA compliance, and Vastu preferences.",
    action: "Try Coach",
    href: "/coach",
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics & ROI",
    description:
      "Track your conversion funnel from lead discovery to deal closure. See which platforms generate the most qualified leads, cost per lead, and conversion rates by source, area, and buyer persona.",
    action: "View Analytics",
    href: "/analytics",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
];

const TOUR_DISMISSED_KEY = "propleads-tour-dismissed";

export function QuickTour() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true); // default hidden until checked

  useEffect(() => {
    const isDismissed = localStorage.getItem(TOUR_DISMISSED_KEY);
    if (!isDismissed) setDismissed(false);
  }, []);

  function dismiss() {
    localStorage.setItem(TOUR_DISMISSED_KEY, "true");
    setDismissed(true);
  }

  function resetTour() {
    localStorage.removeItem(TOUR_DISMISSED_KEY);
    setDismissed(false);
    setStep(0);
  }

  if (dismissed) {
    return (
      <Button variant="ghost" size="sm" onClick={resetTour} className="text-xs text-zinc-400">
        Show Platform Tour
      </Button>
    );
  }

  const current = tourSteps[step];
  const Icon = current.icon;

  return (
    <Card className="border-2 border-dashed border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-500">
              Quick Tour — Step {step + 1} of {tourSteps.length}
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${current.bgColor} shrink-0`}>
            <Icon className={`h-8 w-8 ${current.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-1">{current.title}</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">{current.description}</p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-5">
          {tourSteps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-zinc-900 dark:bg-zinc-100" : "w-2 bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>

          <a href={current.href}>
            <Button variant="outline" size="sm">
              {current.action}
            </Button>
          </a>

          {step < tourSteps.length - 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setStep(step + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={dismiss}>
              Got it!
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
