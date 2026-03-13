"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X, ChevronRight, ChevronLeft, Play,
  LayoutDashboard, Building2, Users, Globe, Send,
  MessageSquare, BarChart3, MapPin, Settings,
  Sparkles, Target,
  GraduationCap, BookOpen,
} from "lucide-react";

// ─── Tour Section & Step Definitions ─────────────────────────────────────────

interface TourStep {
  id: string;
  title: string;
  description: string;
  tip?: string;
  selector?: string;
}

interface TourSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  bgColor: string;
  page: string;
  steps: TourStep[];
}

const tourSections: TourSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    page: "/dashboard",
    steps: [
      {
        id: "welcome",
        title: "Welcome to PropLeads AI",
        description: "PropLeads is your AI-powered real estate lead discovery platform for Hyderabad. It monitors 13+ platforms, detects buyer intent using AI, scores leads, matches them to your properties, and helps you reach out — all on autopilot.",
        tip: "Start by uploading your properties, then configure lead sources. The AI handles the rest.",
      },
      {
        id: "sidebar",
        title: "Sidebar Navigation",
        description: "Your main navigation has 9 sections: Dashboard (overview), Properties (your listings), Leads (discovered prospects), Lead Sources (platform config), Outreach (messaging), AI Coach (sales help), Analytics (performance), Market Intel (area data), and Plans & Settings (billing).",
        selector: "[data-tour='sidebar']",
        tip: "Each section is a full workflow tool. The sidebar stays visible on all pages.",
      },
      {
        id: "search",
        title: "Global Search",
        description: "Search across all your leads and properties instantly. Type a name, area, platform, or keyword to find matching records. Results update as you type.",
        selector: "[data-tour='search']",
      },
      {
        id: "notifications",
        title: "Notifications",
        description: "The bell icon shows unread alerts — primarily hot lead notifications. When a lead scores above the HOT threshold, you get notified here, via Slack, and via email (if configured in Settings).",
        selector: "[data-tour='notifications']",
      },
      {
        id: "kpi-cards",
        title: "KPI Cards",
        description: "Six key metrics at a glance: Total Leads (all-time), This Week (new leads in 7 days), Hot Leads (high-intent buyers), Properties (active listings), Contact Rate (% of leads you've contacted), and Conversion Rate (% that converted to deals).",
        selector: "[data-tour='kpi-cards']",
        tip: "Hot Leads is the most important metric — these are people actively looking to buy in your areas.",
      },
      {
        id: "recent-leads",
        title: "Recent Leads",
        description: "The 10 most recently discovered leads. Each row shows the lead's score (color-coded: red = HOT, orange = WARM, blue = COLD), their name, which platform they came from, and preferred areas. Click any lead to see full details.",
        selector: "[data-tour='recent-leads']",
      },
      {
        id: "source-chart",
        title: "Leads by Source",
        description: "Visual breakdown of which platforms are generating leads. Helps you understand which sources are most productive — Reddit, Facebook, 99acres, Instagram, etc. Use this to decide where to invest more scraping effort.",
        selector: "[data-tour='source-chart']",
      },
      {
        id: "lead-funnel",
        title: "Lead Funnel",
        description: "Tracks your conversion pipeline: NEW → CONTACTED → ENGAGED → SITE_VISIT → NEGOTIATION → CONVERTED. Shows how leads flow through your sales process and where drop-offs happen.",
        selector: "[data-tour='lead-funnel']",
      },
    ],
  },
  {
    id: "properties",
    title: "Properties",
    icon: Building2,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    page: "/properties",
    steps: [
      {
        id: "properties-overview",
        title: "Your Property Portfolio",
        description: "This is where you manage all your real estate listings. Each property has its details — builder name, unit types, pricing, amenities, RERA number, location. The AI uses this data to match incoming leads to the right properties.",
        tip: "Upload properties FIRST before running scraping — the AI needs your inventory to score and match leads properly.",
      },
      {
        id: "upload-button",
        title: "Upload Properties",
        description: "Click 'Upload' to add a new property. You can upload brochure PDFs or images — our AI extracts all details automatically: builder name, unit types (2BHK/3BHK), pricing, amenities, RERA numbers, possession dates. No manual data entry needed.",
        selector: "[data-tour='upload-property']",
        tip: "PDF brochures give the best extraction results. You can also manually add properties.",
      },
      {
        id: "property-cards",
        title: "Property Cards",
        description: "Each card shows: property name, builder, location (area + city), price range (in Lakhs/Crores), number of matched leads, and RERA number. Click any card to see full details including unit types, amenities, USPs, and all matched leads.",
        selector: "[data-tour='property-grid']",
      },
      {
        id: "property-matching",
        title: "How Matching Works",
        description: "When a lead is discovered, the AI compares their requirements (budget, area, property type) against ALL your properties. It generates a match score (0-100%) with detailed reasoning — budget fit, area match, type compatibility, and persona alignment.",
        tip: "The more properties you upload, the better the matching accuracy. Add all your active projects.",
      },
    ],
  },
  {
    id: "scraping",
    title: "Lead Sources",
    icon: Globe,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    page: "/scraping",
    steps: [
      {
        id: "sources-overview",
        title: "Configure Lead Sources",
        description: "This is your command center for lead discovery. You configure WHICH platforms to monitor, WHAT to search for, and WHEN to run. Each 'source' is a specific search query on a specific platform — like monitoring r/hyderabad on Reddit for property-buying posts.",
        selector: "[data-tour='sources-header']",
      },
      {
        id: "add-source",
        title: "Add Source Button",
        description: "Click '+Add Source' to set up a new monitoring target. You'll pick a platform (13+ options), enter an identifier (subreddit name, Facebook group URL, search query), and add keywords. The system will then regularly check this source for new buyer-intent posts.",
        selector: "[data-tour='add-source']",
        tip: "Start with Reddit (free, no API key needed). Then add 99acres, MagicBricks, NoBroker for property portal leads.",
      },
      {
        id: "platforms-explained",
        title: "Platform Tiers",
        description: "Platforms are gated by your plan tier:\n\u2022 FREE: Reddit only (great for starting out)\n\u2022 STARTER: + 99acres, MagicBricks, NoBroker, Facebook, CommonFloor\n\u2022 GROWTH: + Instagram, Twitter, YouTube, LinkedIn, Quora, Telegram, Google Maps\n\u2022 PRO: All platforms + contact enrichment + daily digest",
      },
      {
        id: "run-all",
        title: "Run All Sources",
        description: "The 'Run All Sources' button triggers scraping across ALL your active sources at once. It creates a 'Run Group' that tracks progress. Each platform is scraped independently — if one fails, others still complete.",
        selector: "[data-tour='run-all']",
        tip: "Sources also run automatically via daily cron (6 AM UTC). But you can trigger manual runs anytime.",
      },
      {
        id: "score-match",
        title: "Score & Match",
        description: "The 'Score & Match' button re-scores all unscored leads using AI and matches them against your properties. Useful after uploading new properties — existing leads get re-matched to the new inventory.",
        selector: "[data-tour='score-match']",
      },
      {
        id: "source-cards",
        title: "Source Cards",
        description: "Each source card shows: platform + identifier, keywords being searched, last run time, leads found in last run, and run history. The toggle switch enables/disables the source. The play button runs just that one source. The trash button deletes it.",
        selector: "[data-tour='source-grid']",
      },
      {
        id: "run-history",
        title: "Run History",
        description: "Below the sources, you can see recent run history: date, posts scanned, leads found, and status (COMPLETED/FAILED). Expand a Run Group to see results from all sources in that batch run.",
        selector: "[data-tour='run-history']",
      },
    ],
  },
  {
    id: "leads",
    title: "Leads",
    icon: Users,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    page: "/leads",
    steps: [
      {
        id: "leads-overview",
        title: "Your Lead Pipeline",
        description: "Every person the AI identifies as a potential property buyer lands here. Each lead has a score (0-100), tier (HOT/WARM/COLD), extracted intent data (budget, areas, timeline), and the original post text. This is your primary workspace for lead management.",
        selector: "[data-tour='leads-header']",
      },
      {
        id: "tier-filters",
        title: "Tier Quick Filters",
        description: "Filter buttons at the top let you instantly filter by tier:\n\u2022 HOT (score 70+): High-intent buyers ready to purchase — act fast\n\u2022 WARM (score 40-69): Interested but still exploring — nurture these\n\u2022 COLD (score <40): Low intent or vague queries — monitor",
        selector: "[data-tour='tier-filters']",
        tip: "Focus your daily effort on HOT leads first. These are people who expressed clear buying intent with specific budget and area preferences.",
      },
      {
        id: "lead-search",
        title: "Search & Filter",
        description: "Search by name, original text, or preferred area. The platform dropdown filters by source (Reddit, Facebook, etc.). Combine both for precise filtering — like searching for 'Gachibowli' leads from 'REDDIT' only.",
        selector: "[data-tour='lead-search']",
      },
      {
        id: "lead-cards",
        title: "Lead Cards",
        description: "Each lead card shows: score circle (color = tier), platform badge, lead name, original post preview (2 lines), and extracted details — budget, property type, preferred areas, timeline, buyer persona, and best match %. Click any card to open the full lead detail page.",
        selector: "[data-tour='lead-list']",
      },
      {
        id: "lead-detail-actions",
        title: "Lead Detail — Action Buttons",
        description: "On a lead's detail page, you have action buttons for: Re-score (recalculate AI score), Match Properties (find matching properties), WhatsApp/Email outreach, Enrich Contact (find email/phone via Apollo/Hunter), Find Duplicates (link across platforms), and AI Coach (get coaching for this lead).",
      },
      {
        id: "lead-clustering",
        title: "Cross-Platform Clustering",
        description: "When the same person posts on multiple platforms (e.g., Reddit AND Facebook), the 'Find Duplicates' button links them together. You'll see an 'Also seen on' section showing all linked profiles. This prevents duplicate outreach.",
        tip: "Clustering works best after enrichment — when email/phone matches are available, linking accuracy is highest.",
      },
    ],
  },
  {
    id: "outreach",
    title: "Outreach",
    icon: Send,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    page: "/outreach",
    steps: [
      {
        id: "outreach-overview",
        title: "Outreach Center",
        description: "Create and manage message templates for contacting leads. Templates support variables (like {{name}}, {{property}}, {{area}}) that get filled in automatically. You can create templates for WhatsApp, Email, and SMS.",
        selector: "[data-tour='outreach-header']",
      },
      {
        id: "new-template",
        title: "Create Templates",
        description: "Click 'New Template' to create a message template. Choose the channel (WhatsApp/Email/SMS), category (First Contact, Brochure Share, Site Visit, Follow-up, Price Update, NRI-specific), write the message body with {{variables}}, and save.",
        selector: "[data-tour='new-template']",
        tip: "Create at least 3 templates: a First Contact intro, a Brochure Share follow-up, and a Site Visit invite. These cover the core outreach flow.",
      },
      {
        id: "template-categories",
        title: "Template Categories",
        description: "Six categories match your sales workflow:\n\u2022 FIRST_CONTACT: Initial outreach to new leads\n\u2022 BROCHURE_SHARE: Send property details\n\u2022 SITE_VISIT: Invite to visit the property\n\u2022 FOLLOW_UP: Re-engage after silence\n\u2022 PRICE_UPDATE: Share pricing changes\n\u2022 NRI_SPECIFIC: Tailored for overseas buyers",
      },
    ],
  },
  {
    id: "coach",
    title: "AI Coach",
    icon: GraduationCap,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    page: "/coach",
    steps: [
      {
        id: "coach-overview",
        title: "AI Sales Coaching",
        description: "Your personal AI sales assistant, trained on Hyderabad real estate. It understands Telugu cultural nuances, Vastu preferences, RERA compliance, NRI investment patterns, IT corridor dynamics, and local micro-market trends.",
      },
      {
        id: "conversation-analysis",
        title: "Analyze Conversations",
        description: "Paste any WhatsApp or email conversation with a lead into the 'Analyze Conversation' tab. The AI will assess: sentiment, buying signals detected, objections identified, and recommended next steps.",
        selector: "[data-tour='coach-analyze']",
        tip: "Use this after every significant conversation to catch opportunities you might have missed.",
      },
      {
        id: "message-generator",
        title: "Message Generator",
        description: "The 'Quick Message' tab generates personalized messages by selecting: buyer persona, property name, channel (WhatsApp/Email/SMS), and conversation stage. The AI crafts culturally-appropriate, persona-specific messages.",
        selector: "[data-tour='coach-generate']",
        tip: "The generator adapts language style per persona — tech-savvy tone for IT professionals, investment-focused for NRIs.",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    page: "/analytics",
    steps: [
      {
        id: "analytics-overview",
        title: "Performance Analytics",
        description: "Track everything about your lead generation: which platforms work best, how your funnel converts, enrichment success rates, and usage against your plan limits.",
      },
      {
        id: "usage-meters",
        title: "Usage Meters",
        description: "Two progress bars show your current usage:\n\u2022 Runs Today: How many scraping runs you've used today vs your plan limit\n\u2022 Leads This Month: Total new leads this month vs your monthly cap\nWhen either limit is reached, scraping pauses until the next reset.",
        selector: "[data-tour='usage-meters']",
        tip: "FREE: 2 runs/day, 50 leads/month. STARTER: 5/200. GROWTH: 10/500. PRO: Unlimited.",
      },
      {
        id: "platform-health",
        title: "Platform Health",
        description: "Three critical metrics: Scraping Success Rate (% of runs without errors), Enrichment Rate (% of leads with contact info), and Cross-platform Clusters (leads linked across platforms).",
        selector: "[data-tour='platform-health']",
      },
      {
        id: "tier-breakdown",
        title: "Lead Quality Distribution",
        description: "Shows the proportion of HOT, WARM, and COLD leads. A healthy distribution has 10-20% HOT leads. If most leads are COLD, review your source keywords — they may be too broad.",
        selector: "[data-tour='tier-breakdown']",
      },
      {
        id: "source-performance",
        title: "Source Performance",
        description: "Platform-by-platform breakdown showing lead count and average score. Helps identify your best-performing sources. If a platform has high volume but low avg score, consider refining keywords.",
        selector: "[data-tour='source-performance']",
      },
    ],
  },
  {
    id: "market",
    title: "Market Intel",
    icon: MapPin,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    page: "/market",
    steps: [
      {
        id: "market-overview",
        title: "Hyderabad Market Intelligence",
        description: "Real-time data on Hyderabad's real estate micro-markets. Shows pricing trends, growth rates, and buyer preferences for each area — Gachibowli, Kondapur, HITEC City, Kokapet, Narsingi, Tellapur, and more.",
      },
      {
        id: "micro-markets",
        title: "Micro-Market Cards",
        description: "Each area card shows: price range per sqft, growth percentage, a 'hotness' score, and the dominant buyer persona. Areas are tagged as 'Hot' (score 85+), 'Warm' (70+), or 'Emerging'.",
        selector: "[data-tour='micro-markets']",
        tip: "Match your property listings to 'Hot' micro-markets for the best lead-to-property match rates.",
      },
      {
        id: "buyer-personas",
        title: "Buyer Personas",
        description: "Six buyer segments with typical budgets and preferred areas:\n\u2022 IT Professional: 50L-1.5Cr, tech corridors\n\u2022 NRI: 1Cr+, premium areas\n\u2022 First-time Buyer: 30-60L, affordable zones\n\u2022 Investor: Multiple properties, rental yield focus\n\u2022 Luxury Buyer: 2Cr+, Jubilee Hills/Banjara Hills\n\u2022 Family Upgrader: 80L-1.5Cr, established areas",
        selector: "[data-tour='personas']",
      },
    ],
  },
  {
    id: "settings",
    title: "Plans & Settings",
    icon: Settings,
    color: "text-zinc-500",
    bgColor: "bg-zinc-500/10",
    page: "/settings/plan",
    steps: [
      {
        id: "plans-overview",
        title: "Subscription Plans",
        description: "Four tiers with different capabilities:\n\u2022 FREE: Reddit only, 2 runs/day, 50 leads/month\n\u2022 STARTER (375/mo): Property portals + Facebook, 5 runs/day, 200 leads\n\u2022 GROWTH (1,750/mo): All social media, auto-scoring, notifications, 500 leads\n\u2022 PRO (3,000/mo): Everything + enrichment, daily digest, unlimited leads",
      },
      {
        id: "billing-toggle",
        title: "Monthly vs Annual",
        description: "Toggle between monthly and annual billing. Annual plans save 20%. Click 'Upgrade' on any plan card to switch tiers.",
        selector: "[data-tour='billing-toggle']",
        tip: "Payments are handled via Razorpay. You can use UPI, cards, net banking, or wallets.",
      },
      {
        id: "notifications-config",
        title: "Hot Lead Notifications",
        description: "Configure where to receive alerts when a HOT lead is discovered: Slack Webhook URL and/or email address. Requires GROWTH plan or above.",
        selector: "[data-tour='notifications-config']",
        tip: "Set up Slack notifications for your sales team channel — instant alerts mean faster response times on hot leads.",
      },
    ],
  },
];

// ─── CSS injected once via <style> tag ───────────────────────────────────────

const TOUR_CSS = `
.tour-highlight {
  position: relative;
  z-index: 5;
  outline: 3px solid #6366f1 !important;
  outline-offset: 4px;
  border-radius: 8px;
  animation: tour-pulse 2s ease-in-out infinite;
}
@keyframes tour-pulse {
  0%, 100% { outline-color: #6366f1; }
  50% { outline-color: #a5b4fc; }
}
`;

// ─── Tour Component ──────────────────────────────────────────────────────────

const TOUR_KEY = "propleads-tour-dismissed";
const TOUR_PROGRESS_KEY = "propleads-tour-progress";

function clearAllHighlights() {
  try {
    document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
  } catch {}
}

export function QuickTour() {
  const router = useRouter();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cssInjectedRef = useRef(false);

  // Inject CSS once
  useEffect(() => {
    if (cssInjectedRef.current) return;
    cssInjectedRef.current = true;
    const style = document.createElement("style");
    style.setAttribute("data-tour-css", "");
    style.textContent = TOUR_CSS;
    document.head.appendChild(style);
  }, []);

  // Load state from localStorage
  useEffect(() => {
    try {
      const isDismissed = localStorage.getItem(TOUR_KEY);
      if (!isDismissed) setDismissed(false);

      const saved = localStorage.getItem(TOUR_PROGRESS_KEY);
      if (saved) {
        const { s, t } = JSON.parse(saved);
        if (
          typeof s === "number" && typeof t === "number" &&
          s >= 0 && s < tourSections.length &&
          t >= 0 && t < tourSections[s].steps.length
        ) {
          setSectionIdx(s);
          setStepIdx(t);
        }
      }
    } catch {}
  }, []);

  // Save progress
  useEffect(() => {
    if (!dismissed) {
      try {
        localStorage.setItem(TOUR_PROGRESS_KEY, JSON.stringify({ s: sectionIdx, t: stepIdx }));
      } catch {}
    }
  }, [sectionIdx, stepIdx, dismissed]);

  // Highlight target element with retry for page transitions
  useEffect(() => {
    if (dismissed || !expanded) {
      clearAllHighlights();
      return;
    }

    // Bounds check
    if (sectionIdx >= tourSections.length) return;
    const section = tourSections[sectionIdx];
    if (stepIdx >= section.steps.length) return;
    const step = section.steps[stepIdx];

    // Clear previous highlights
    clearAllHighlights();
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }

    if (!step.selector) return;

    // Try to find and highlight element, with retries for page transitions
    let attempts = 0;
    const maxAttempts = 10;

    function tryHighlight() {
      attempts++;
      try {
        const el = document.querySelector(step.selector!);
        if (el) {
          el.classList.add("tour-highlight");
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      } catch {}

      if (attempts < maxAttempts) {
        highlightTimerRef.current = setTimeout(tryHighlight, 300);
      }
    }

    // Small delay to let new page render
    highlightTimerRef.current = setTimeout(tryHighlight, 150);

    return () => {
      clearAllHighlights();
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, [sectionIdx, stepIdx, dismissed, expanded, pathname]);

  // Bounds-safe accessors
  const section = tourSections[sectionIdx] ?? tourSections[0];
  const step = section.steps[stepIdx] ?? section.steps[0];
  const Icon = section.icon;

  const totalSteps = tourSections.reduce((sum, s) => sum + s.steps.length, 0);
  const currentGlobalStep = tourSections.slice(0, sectionIdx).reduce((sum, s) => sum + s.steps.length, 0) + stepIdx + 1;

  const navigateToPage = useCallback((page: string) => {
    if (pathname !== page) {
      setNavigating(true);
      router.push(page);
      // Wait for navigation to complete
      setTimeout(() => setNavigating(false), 800);
    }
  }, [pathname, router]);

  function goNext() {
    if (stepIdx < section.steps.length - 1) {
      setStepIdx(stepIdx + 1);
    } else if (sectionIdx < tourSections.length - 1) {
      const nextSection = tourSections[sectionIdx + 1];
      setSectionIdx(sectionIdx + 1);
      setStepIdx(0);
      navigateToPage(nextSection.page);
    }
  }

  function goBack() {
    if (stepIdx > 0) {
      setStepIdx(stepIdx - 1);
    } else if (sectionIdx > 0) {
      const prevSection = tourSections[sectionIdx - 1];
      setSectionIdx(sectionIdx - 1);
      setStepIdx(prevSection.steps.length - 1);
      navigateToPage(prevSection.page);
    }
  }

  function jumpToSection(idx: number) {
    if (idx < 0 || idx >= tourSections.length) return;
    setSectionIdx(idx);
    setStepIdx(0);
    navigateToPage(tourSections[idx].page);
  }

  function dismiss() {
    try {
      localStorage.setItem(TOUR_KEY, "true");
      localStorage.removeItem(TOUR_PROGRESS_KEY);
    } catch {}
    setDismissed(true);
    clearAllHighlights();
  }

  function resetTour() {
    try {
      localStorage.removeItem(TOUR_KEY);
      localStorage.removeItem(TOUR_PROGRESS_KEY);
    } catch {}
    setDismissed(false);
    setSectionIdx(0);
    setStepIdx(0);
    setExpanded(true);
  }

  const isLast = sectionIdx === tourSections.length - 1 && stepIdx === section.steps.length - 1;
  const isFirst = sectionIdx === 0 && stepIdx === 0;

  // Dismissed — show restart button
  if (dismissed) {
    return (
      <button
        onClick={resetTour}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <BookOpen className="h-4 w-4" />
        Platform Tour
      </button>
    );
  }

  // Minimized
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-zinc-800 transition-all dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <Play className="h-4 w-4" />
        Tour {currentGlobalStep}/{totalSteps}
      </button>
    );
  }

  // Full tour panel
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-h-[85vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${section.bgColor}`}>
            <Icon className={`h-4 w-4 ${section.color}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</p>
            <p className="text-[10px] text-zinc-400">Step {currentGlobalStep} of {totalSteps}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(false)} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors" title="Minimize">
            <ChevronRight className="h-4 w-4 text-zinc-400 rotate-90" />
          </button>
          <button onClick={dismiss} className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors" title="Close tour">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Section Navigator */}
      <div className="flex gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto no-scrollbar">
        {tourSections.map((s, i) => {
          const SIcon = s.icon;
          const isActive = i === sectionIdx;
          const isCompleted = i < sectionIdx;
          return (
            <button
              key={s.id}
              onClick={() => jumpToSection(i)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : isCompleted
                    ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title={s.title}
            >
              <SIcon className="h-3 w-3" />
              {isActive && <span>{s.title}</span>}
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">{step.description}</p>

        {step.tip && (
          <div className="flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{step.tip}</span>
          </div>
        )}

        {/* Step dots within section */}
        <div className="flex items-center gap-1 pt-1">
          {section.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx ? "w-5 bg-zinc-900 dark:bg-zinc-100" : i < stepIdx ? "w-1.5 bg-green-400" : "w-1.5 bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Global progress bar */}
      <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
          style={{ width: `${(currentGlobalStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={isFirst || navigating}
          className="text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
        </Button>

        {step.selector && pathname === section.page ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              try {
                const el = document.querySelector(step.selector!);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              } catch {}
            }}
          >
            <Target className="h-3 w-3 mr-1" /> Show
          </Button>
        ) : pathname !== section.page ? (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => navigateToPage(section.page)}
            disabled={navigating}
          >
            Go to {section.title}
          </Button>
        ) : null}

        {isLast ? (
          <Button size="sm" onClick={dismiss} className="text-xs">
            Finish Tour
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={navigating}
            className="text-xs"
          >
            Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
