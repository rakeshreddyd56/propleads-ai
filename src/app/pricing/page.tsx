import Link from "next/link";

const plans = [
  {
    name: "Free", monthly: 0, annual: 0, tagline: "Get started with lead discovery",
    features: ["Reddit + web search", "Up to 50 leads/month", "2 runs/day", "AI intent detection", "Manual score & match"],
    notIncluded: ["Property portal scraping", "Social media scraping", "Auto-scoring", "Hot lead alerts"],
    cta: "Start Free", highlighted: false,
  },
  {
    name: "Starter", monthly: 37500, annual: 30000, tagline: "For brokers & small agents",
    features: ["Everything in Free", "99acres, MagicBricks, NoBroker", "Facebook Groups", "CommonFloor forums", "Up to 200 leads/month", "5 runs/day"],
    notIncluded: ["Social media scraping", "Auto-scoring", "Hot lead alerts"],
    cta: "Get Started", highlighted: false,
  },
  {
    name: "Growth", monthly: 175000, annual: 140000, tagline: "For mid-size builders",
    features: ["Everything in Starter", "Instagram, Twitter, YouTube", "LinkedIn, Quora, Telegram", "Real-time search", "Up to 500 leads/month", "10 runs/day", "Auto-score on scrape", "AI-powered property matching", "Hot lead alerts (Slack/Email)"],
    notIncluded: ["Social graph analysis", "Contact enrichment"],
    cta: "Upgrade to Growth", highlighted: true,
  },
  {
    name: "Pro", monthly: 300000, annual: 240000, tagline: "For large builders & enterprises",
    features: ["Everything in Growth", "Social graph analysis", "Deep scraping", "Contact enrichment (email, phone)", "Cross-platform lead dedup", "1000+ leads/month", "Unlimited runs", "Daily lead digest"],
    notIncluded: [],
    cta: "Contact Sales", highlighted: false,
  },
];

function formatPrice(amount: number) {
  if (amount === 0) return "Free";
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${(amount / 1000).toFixed(0)}K`;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-20 pb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Find Qualified Buyers Before Your Competition
        </h1>
        <p className="mt-4 text-lg text-zinc-600 max-w-2xl mx-auto">
          AI-powered lead discovery across 13+ platforms. Every lead is intent-verified
          and matched to your property inventory.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          One converted lead on a 1Cr property = 2-3L commission. PropLeads pays for itself with a single conversion.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                plan.highlighted ? "border-zinc-900 ring-2 ring-zinc-900 relative" : "border-zinc-200"
              }`}>
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-900">{plan.name}</h3>
                <p className="text-sm text-zinc-500 mt-1">{plan.tagline}</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-zinc-900">{formatPrice(plan.monthly)}</span>
                  {plan.monthly > 0 && <span className="text-sm text-zinc-500">/month</span>}
                </div>
                {plan.annual > 0 && plan.annual < plan.monthly && (
                  <p className="text-xs text-green-600 mt-1">
                    {formatPrice(plan.annual)}/mo billed annually (save 20%)
                  </p>
                )}
              </div>
              <Link href="/sign-up"
                className={`block w-full text-center rounded-lg py-2.5 text-sm font-medium transition-colors ${
                  plan.highlighted ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                }`}>
                {plan.cta}
              </Link>
              <div className="mt-6 flex-1">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                      <span className="text-green-500 mt-0.5">&#10003;</span>{f}
                    </li>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className="mt-0.5">&#10007;</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
