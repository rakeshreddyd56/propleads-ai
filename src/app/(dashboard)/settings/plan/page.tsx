"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, Crown, Zap, Rocket, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const planIcons: Record<string, any> = { FREE: Shield, STARTER: Zap, GROWTH: Rocket, PRO: Crown };

function formatINR(amount: number) {
  if (amount === 0) return "Free";
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return `₹${(amount / 1000).toFixed(0)}K`;
}

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
    }).finally(() => setLoading(false));
  }, []);

  async function upgradeTo(tier: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/plans/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, billingCycle }),
      });
      if (res.ok) {
        toast.success(`Switched to ${tier} plan`);
        const d = await fetch("/api/plans").then((r) => r.json());
        setData(d);
      } else {
        toast.error("Failed to upgrade");
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Plan & Settings</h1>
        <p className="text-sm text-zinc-500">Manage your subscription and notification preferences</p>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-sm text-zinc-500">Current Plan</p><p className="text-xl font-bold">{currentTier}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-zinc-500">Runs Today</p><p className="text-xl font-bold">{data?.current?.runsToday ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-zinc-500">Leads This Month</p><p className="text-xl font-bold">{data?.current?.leadsThisMonth ?? 0}</p></CardContent></Card>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={() => setBillingCycle("monthly")}
          className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            billingCycle === "monthly" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          )}>Monthly</button>
        <button onClick={() => setBillingCycle("annual")}
          className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            billingCycle === "annual" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
          )}>Annual <Badge variant="secondary" className="ml-2 text-[10px]">Save 20%</Badge></button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data?.plans?.map((plan: any) => {
          const Icon = planIcons[plan.tier] ?? Shield;
          const isCurrent = plan.tier === currentTier;
          const price = billingCycle === "annual" ? plan.annual : plan.monthly;

          return (
            <Card key={plan.tier} className={cn("relative", isCurrent && "ring-2 ring-zinc-900")}>
              {isCurrent && <Badge className="absolute -top-2.5 right-4 bg-zinc-900">Current</Badge>}
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <p className="text-xs text-zinc-500">{plan.tagline}</p>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold mb-1">{formatINR(price)}</p>
                {price > 0 && <p className="text-xs text-zinc-500 mb-4">per month{billingCycle === "annual" ? ", billed annually" : ""}</p>}
                <div className="space-y-1 mb-4 text-xs text-zinc-600">
                  <p>{plan.platforms.length} platforms</p>
                  <p>{plan.runsPerDay === 999 ? "Unlimited" : plan.runsPerDay} runs/day</p>
                  <p>{plan.leadsPerMonth === 9999 ? "Unlimited" : plan.leadsPerMonth} leads/mo</p>
                </div>
                {!isCurrent && (
                  <Button size="sm" className="w-full" variant={plan.tier === "FREE" ? "outline" : "default"}
                    disabled={saving} onClick={() => upgradeTo(plan.tier)}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : plan.tier === "FREE" ? "Downgrade" : "Upgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hot Lead Notifications</CardTitle>
          <p className="text-xs text-zinc-500">
            Get notified when a HOT lead is found.
            {!["GROWTH", "PRO"].includes(currentTier) && <span className="text-amber-600"> Requires Growth plan or above.</span>}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label htmlFor="slack">Slack Webhook URL</Label>
            <Input id="slack" placeholder="https://hooks.slack.com/services/..." value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)} disabled={!["GROWTH", "PRO"].includes(currentTier)} /></div>
          <div><Label htmlFor="email">Notification Email</Label>
            <Input id="email" type="email" placeholder="you@company.com" value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)} disabled={!["GROWTH", "PRO"].includes(currentTier)} /></div>
          <Button size="sm" onClick={saveNotifications}
            disabled={saving || !["GROWTH", "PRO"].includes(currentTier)}>Save Notifications</Button>
        </CardContent>
      </Card>
    </div>
  );
}
