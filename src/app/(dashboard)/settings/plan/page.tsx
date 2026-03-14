"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, X, Crown, Zap, Rocket, Shield, Bell, Key, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const planMeta: Record<string, { icon: any; color: string; bgColor: string }> = {
  FREE: { icon: Shield, color: "text-zinc-600", bgColor: "bg-zinc-100" },
  STARTER: { icon: Zap, color: "text-blue-600", bgColor: "bg-blue-50" },
  GROWTH: { icon: Rocket, color: "text-orange-600", bgColor: "bg-orange-50" },
  PRO: { icon: Crown, color: "text-purple-600", bgColor: "bg-purple-50" },
};

function formatINR(paise: number) {
  if (paise === 0) return "Free";
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

// Feature list per tier for the plan comparison
const tierFeatures: Record<string, string[]> = {
  FREE: [
    "Reddit monitoring",
    "AI intent detection",
    "Manual lead scoring",
    "Property brochure upload (AI extraction)",
    "AI conversation coach",
    "Lead management dashboard",
    "Analytics & funnel tracking",
  ],
  STARTER: [
    "Everything in Free",
    "99acres, MagicBricks, NoBroker",
    "Facebook Groups & CommonFloor",
    "200 leads/month, 5 runs/day",
  ],
  GROWTH: [
    "Everything in Starter",
    "Instagram, Twitter/X, YouTube",
    "LinkedIn, Quora, Telegram, Google Maps",
    "Auto-score leads on scrape",
    "AI-powered property matching",
    "Hot lead alerts (Slack + Email)",
    "Real-time search (SerpAPI)",
    "500 leads/month, 10 runs/day",
  ],
  PRO: [
    "Everything in Growth",
    "Contact enrichment (email, phone, company)",
    "Cross-platform lead deduplication",
    "Daily lead digest email",
    "Deep scraping mode",
    "Unlimited leads & runs",
    "Priority support",
  ],
};

const tierExcluded: Record<string, string[]> = {
  FREE: ["Property portals (99acres, MagicBricks)", "Social media scraping", "Auto-scoring", "Hot lead alerts", "Contact enrichment", "Lead dedup"],
  STARTER: ["Social media scraping", "Auto-scoring", "Hot lead alerts", "Contact enrichment", "Lead dedup"],
  GROWTH: ["Contact enrichment", "Cross-platform dedup", "Daily digest"],
  PRO: [],
};

export default function PlanSettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [slackUrl, setSlackUrl] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then((d) => {
      setData(d);
      setBillingCycle(d.current.billingCycle ?? "monthly");
      setSlackUrl(d.current.slackWebhookUrl ?? "");
      setNotifyEmail(d.current.notifyEmail ?? "");
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function upgradeTo(tier: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/plans/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billingCycle }),
      });
      const result = await res.json();
      if (res.ok) {
        if (result.checkoutUrl) {
          toast.info("Redirecting to payment...");
          window.open(result.checkoutUrl, "_blank");
        } else {
          toast.success(`Switched to ${tier} plan`);
        }
        const d = await fetch("/api/plans").then((r) => r.json());
        setData(d);
      } else {
        toast.error(result.error ?? "Failed to upgrade");
      }
    } finally { setSaving(false); }
  }

  async function saveNotifications() {
    setSaving(true);
    try {
      const res = await fetch("/api/plans/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slackWebhookUrl: slackUrl, notifyEmail }),
      });
      if (res.ok) toast.success("Notification settings saved");
      else toast.error("Failed to save");
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;

  const currentTier = data?.current?.tier ?? "FREE";
  const meta = planMeta[currentTier] ?? planMeta.FREE;
  const CurrentIcon = meta.icon;
  const runsToday = data?.current?.runsToday ?? 0;
  const leadsThisMonth = data?.current?.leadsThisMonth ?? 0;

  // Get limits for current plan
  const currentPlan = data?.plans?.find((p: any) => p.tier === currentTier);
  const runsLimit = currentPlan?.runsPerDay ?? 2;
  const leadsLimit = currentPlan?.leadsPerMonth ?? 50;
  const isUnlimitedRuns = runsLimit >= 999;
  const isUnlimitedLeads = leadsLimit >= 9999;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plans & Settings</h1>
        <p className="text-sm text-zinc-500">Manage your subscription, usage, and notification preferences</p>
      </div>

      <Tabs defaultValue="plan">
        <TabsList>
          <TabsTrigger value="plan">Plan & Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="compliance">Compliance & API</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* ─── Plan & Billing ─── */}
        <TabsContent value="plan" className="space-y-6 mt-4">
          {/* Current Plan + Usage Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("p-2 rounded-lg", meta.bgColor)}>
                    <CurrentIcon className={cn("h-5 w-5", meta.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500">Current Plan</p>
                    <p className="text-xl font-bold">{currentPlan?.name ?? currentTier}</p>
                  </div>
                </div>
                {currentPlan && (
                  <p className="text-xs text-zinc-500">
                    {formatINR(billingCycle === "annual" ? currentPlan.annual : currentPlan.monthly)}
                    {currentPlan.monthly > 0 ? `/mo${billingCycle === "annual" ? " (annual)" : ""}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-zinc-500 mb-2">Runs Today</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl font-bold">{runsToday}</span>
                  <span className="text-sm text-zinc-500">/ {isUnlimitedRuns ? "∞" : runsLimit}</span>
                </div>
                {isUnlimitedRuns ? (
                  <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full w-full opacity-50" />
                  </div>
                ) : (
                  <Progress
                    value={Math.min((runsToday / runsLimit) * 100, 100)}
                    className="h-2"
                  />
                )}
                {!isUnlimitedRuns && runsToday >= runsLimit && (
                  <p className="text-xs text-red-500 mt-1.5">Daily limit reached. Resets at midnight UTC.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <p className="text-xs text-zinc-500 mb-2">Leads This Month</p>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-xl font-bold">{leadsThisMonth}</span>
                  <span className="text-sm text-zinc-500">/ {isUnlimitedLeads ? "∞" : leadsLimit}</span>
                </div>
                {isUnlimitedLeads ? (
                  <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-400 rounded-full w-full opacity-50" />
                  </div>
                ) : (
                  <Progress
                    value={Math.min((leadsThisMonth / leadsLimit) * 100, 100)}
                    className="h-2"
                  />
                )}
                {!isUnlimitedLeads && leadsThisMonth >= leadsLimit && (
                  <p className="text-xs text-red-500 mt-1.5">Monthly limit reached. Resets on the 1st.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Billing Toggle */}
          <div data-tour="billing-toggle" className="flex items-center justify-center gap-3">
            <button onClick={() => setBillingCycle("monthly")}
              className={cn("rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
                billingCycle === "monthly" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              )}>Monthly</button>
            <button onClick={() => setBillingCycle("annual")}
              className={cn("rounded-lg px-5 py-2.5 text-sm font-medium transition-colors flex items-center gap-2",
                billingCycle === "annual" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              )}>Annual
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                billingCycle === "annual" ? "bg-green-400 text-green-950" : "bg-green-100 text-green-700"
              )}>Save 20%</span>
            </button>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.plans?.map((plan: any) => {
              const pm = planMeta[plan.tier] ?? planMeta.FREE;
              const Icon = pm.icon;
              const isCurrent = plan.tier === currentTier;
              const price = billingCycle === "annual" ? plan.annual : plan.monthly;
              const features = tierFeatures[plan.tier] ?? [];
              const excluded = tierExcluded[plan.tier] ?? [];

              return (
                <Card key={plan.tier} className={cn("relative flex flex-col", isCurrent && "ring-2 ring-zinc-900")}>
                  {isCurrent && <Badge className="absolute -top-2.5 right-4 bg-zinc-900">Current</Badge>}
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", pm.bgColor)}>
                        <Icon className={cn("h-4 w-4", pm.color)} />
                      </div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                    </div>
                    <p className="text-xs text-zinc-500">{plan.tagline}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="mb-3">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-2xl font-bold">{formatINR(price)}</span>
                        {price > 0 && <span className="text-xs text-zinc-500">/mo</span>}
                      </div>
                      {price > 0 && billingCycle === "annual" && (
                        <p className="text-[10px] text-green-600">Billed annually</p>
                      )}
                    </div>

                    {/* Limits summary */}
                    <div className="rounded-lg bg-zinc-50 p-2.5 mb-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Platforms</span>
                        <span className="font-medium">{plan.platforms.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Runs/day</span>
                        <span className="font-medium">{plan.runsPerDay >= 999 ? "Unlimited" : plan.runsPerDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Leads/mo</span>
                        <span className="font-medium">{plan.leadsPerMonth >= 9999 ? "Unlimited" : plan.leadsPerMonth}</span>
                      </div>
                    </div>

                    {/* Feature list */}
                    <div className="flex-1 space-y-1.5 mb-4">
                      {features.map((f) => (
                        <div key={f} className="flex items-start gap-1.5 text-xs text-zinc-700">
                          <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" /><span>{f}</span>
                        </div>
                      ))}
                      {excluded.slice(0, 3).map((f) => (
                        <div key={f} className="flex items-start gap-1.5 text-xs text-zinc-400">
                          <X className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{f}</span>
                        </div>
                      ))}
                    </div>

                    {!isCurrent ? (
                      <Button size="sm" className="w-full"
                        variant={plan.tier === "FREE" ? "outline" : "default"}
                        disabled={saving} onClick={() => upgradeTo(plan.tier)}>
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : plan.tier === "FREE" ? "Downgrade" : "Upgrade"}
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full" variant="outline" disabled>
                        Current Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-xs text-zinc-500">
            Payments handled securely via Razorpay. UPI, cards, net banking, wallets accepted.
            <br />Annual plans save 20%. Upgrade or downgrade anytime.
          </p>
        </TabsContent>

        {/* ─── Notifications ─── */}
        <TabsContent value="notifications" className="mt-4">
          <Card data-tour="notifications-config">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Hot Lead Notifications</CardTitle>
              </div>
              <p className="text-xs text-zinc-500">
                Get notified instantly when a HOT lead (score 70+) is discovered.
                {!["GROWTH", "PRO"].includes(currentTier) && (
                  <span className="text-amber-600 font-medium"> Requires Growth plan or above.</span>
                )}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="slack">Slack Webhook URL</Label>
                <Input id="slack" placeholder="https://hooks.slack.com/services/..." value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)} disabled={!["GROWTH", "PRO"].includes(currentTier)} />
                <p className="text-[10px] text-zinc-400 mt-1">Paste your Slack incoming webhook URL. Hot leads will post to this channel.</p>
              </div>
              <div>
                <Label htmlFor="email">Notification Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)} disabled={!["GROWTH", "PRO"].includes(currentTier)} />
                <p className="text-[10px] text-zinc-400 mt-1">Email address to receive hot lead alerts.</p>
              </div>
              <Button size="sm" onClick={saveNotifications}
                disabled={saving || !["GROWTH", "PRO"].includes(currentTier)}>
                {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                Save Notifications
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Compliance & API ─── */}
        <TabsContent value="compliance" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">Compliance Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">DPDP Act 2023</span>
                <Badge variant="outline" className="text-blue-600 border-blue-200">Built-in</Badge>
              </div>
              <p className="text-xs text-zinc-500">All outreach requires explicit opt-in. Leads must consent before email/WhatsApp.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm">TRAI DND Check</span>
                <Badge variant="outline" className="text-blue-600 border-blue-200">Built-in</Badge>
              </div>
              <p className="text-xs text-zinc-500">DND status is checked before SMS outreach to prevent regulatory violations.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm">RERA Display</span>
                <Badge variant="outline" className="text-blue-600 border-blue-200">Informational</Badge>
              </div>
              <p className="text-xs text-zinc-500">RERA numbers are extracted from brochures and displayed on property cards. Verification is the broker&apos;s responsibility.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-orange-500" />
                <CardTitle className="text-base">API Configuration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Anthropic (AI)", env: "ANTHROPIC_API_KEY", desc: "Powers intent detection, scoring, and conversation coach" },
                { label: "Firecrawl", env: "FIRECRAWL_API_KEY", desc: "Web scraping engine for all platforms" },
                { label: "Reddit API", env: "REDDIT_CLIENT_ID", desc: "Reddit post scraping" },
                { label: "Apollo.io", env: "APOLLO_API_KEY", desc: "Contact enrichment (Pro plan)" },
                { label: "Hunter.io", env: "HUNTER_API_KEY", desc: "Email lookup (Pro plan)" },
                { label: "Razorpay", env: "RAZORPAY_KEY_ID", desc: "Payment processing" },
              ].map((key) => (
                <div key={key.env} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{key.label}</p>
                    <p className="text-[10px] text-zinc-400">{key.desc}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{key.env}</Badge>
                </div>
              ))}
              <p className="text-xs text-zinc-400 pt-2">API keys are managed as environment variables on the server. Contact your administrator to update them.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Team ─── */}
        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-base">Team Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-600">
                Team members share the same organization, leads, properties, and plan limits.
                Use the user menu (top-right avatar) to invite team members and manage roles.
              </p>
              <p className="text-xs text-zinc-400">
                Team management is powered by Clerk. You can invite members, set roles (admin/member), and remove users directly from the user menu.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
