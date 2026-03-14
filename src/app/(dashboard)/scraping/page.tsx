"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Globe, Play, Plus, Loader2, Trash2, Zap, CheckCircle2, XCircle, Clock, Lock, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIER_PLATFORMS: Record<string, string[]> = {
  FREE: ["REDDIT"],
  STARTER: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
  ],
  GROWTH: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
    "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM",
    "GOOGLE_MAPS",
  ],
  PRO: [
    "REDDIT", "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER",
    "FACEBOOK", "COMMONFLOOR",
    "INSTAGRAM", "TWITTER", "YOUTUBE", "LINKEDIN", "QUORA", "TELEGRAM",
    "GOOGLE_MAPS",
  ],
};

const platformConfig: Record<string, { label: string; icon: string; requiresApify: boolean; description: string }> = {
  REDDIT: { label: "Reddit", icon: "🔴", requiresApify: false, description: "Public posts via Firecrawl web search" },
  FACEBOOK: { label: "Facebook", icon: "📘", requiresApify: false, description: "Facebook Groups via web search" },
  TWITTER: { label: "X / Twitter", icon: "🐦", requiresApify: false, description: "Tweet search via web search" },
  QUORA: { label: "Quora", icon: "❓", requiresApify: false, description: "Property Q&A via web search" },
  GOOGLE_MAPS: { label: "Google Maps", icon: "📍", requiresApify: false, description: "Agent/builder reviews via web search" },
  NINETY_NINE_ACRES: { label: "99acres", icon: "🏠", requiresApify: false, description: "Property portal via web search" },
  MAGICBRICKS: { label: "MagicBricks", icon: "🧱", requiresApify: false, description: "Property portal via web search" },
  NOBROKER: { label: "NoBroker", icon: "🔑", requiresApify: false, description: "Direct owner listings via web search" },
  COMMONFLOOR: { label: "CommonFloor", icon: "🏢", requiresApify: false, description: "Society forums via Firecrawl" },
  INSTAGRAM: { label: "Instagram", icon: "📸", requiresApify: false, description: "Property hashtags via web search" },
  LINKEDIN: { label: "LinkedIn", icon: "💼", requiresApify: false, description: "Professional posts via web search" },
  YOUTUBE: { label: "YouTube", icon: "▶️", requiresApify: false, description: "Video comments via web search" },
  TELEGRAM: { label: "Telegram", icon: "✈️", requiresApify: false, description: "Group messages via web search" },
};

const platformOptions = Object.keys(platformConfig);

export default function ScrapingPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [runningSources, setRunningSources] = useState<Set<string>>(new Set());
  const [scoring, setScoring] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newSource, setNewSource] = useState({ platform: "", identifier: "", displayName: "", keywords: "" });
  const [tier, setTier] = useState<string>("FREE");
  const [runsToday, setRunsToday] = useState(0);
  const [maxRuns, setMaxRuns] = useState(2);
  const [runHistory, setRunHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/scraping/sources")
      .then((r) => r.json())
      .then(setSources)
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/plans").then((r) => r.json()).then((d) => {
      setTier(d.current.tier);
      setRunsToday(d.current.runsToday);
      const limits: Record<string, number> = { FREE: 2, STARTER: 5, GROWTH: 10, PRO: 999 };
      setMaxRuns(limits[d.current.tier] ?? 2);
    }).catch(() => {});
    fetch("/api/scraping/run-groups?limit=5").then((r) => r.json()).then(setRunHistory).catch(() => {});
  }, []);

  async function refreshSources() {
    const res = await fetch("/api/scraping/sources");
    if (res.ok) setSources(await res.json());
  }

  async function runSource(sourceId: string, sourceName: string) {
    setRunningSources((prev) => new Set([...prev, sourceId]));
    try {
      const res = await fetch("/api/scraping/run-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(`${sourceName}: ${data.error}`);
      } else if (data.leadsFound > 0) {
        toast.success(`${sourceName}: ${data.leadsFound} leads from ${data.postsScanned} posts`);
      } else {
        toast.info(`${sourceName}: ${data.postsScanned} posts scanned, no new leads`);
      }
      await refreshSources();
    } catch {
      toast.error(`${sourceName}: Failed`);
    } finally {
      setRunningSources((prev) => { const n = new Set(prev); n.delete(sourceId); return n; });
    }
  }

  async function runAll() {
    setRunningAll(true);

    try {
      // Create a run group first
      const groupRes = await fetch("/api/scraping/run-group", { method: "POST" });
      const groupData = await groupRes.json();

      if (!groupRes.ok) {
        toast.error(groupData.error ?? "Failed to create run group");
        setRunningAll(false);
        return;
      }

      const { runGroupId, eligible, locked } = groupData;

      if (locked.length > 0) {
        const lockedNames = locked.map((s: any) => platformConfig[s.platform]?.label ?? s.platform).join(", ");
        toast.warning(`${locked.length} source(s) locked on ${tier} plan: ${lockedNames}. Upgrade to unlock.`);
      }

      if (eligible.length === 0) {
        toast.error("No eligible sources for your plan");
        setRunningAll(false);
        return;
      }

      let totalNew = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let succeeded = 0;

      for (const source of eligible) {
        const config = platformConfig[source.platform];
        setRunningSources((prev) => new Set([...prev, source.id]));

        try {
          const res = await fetch("/api/scraping/run-source", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceId: source.id, runGroupId }),
          });
          const data = await res.json();
          if (!data.error) {
            totalNew += data.leadsFound ?? data.newLeads ?? 0;
            totalUpdated += data.leadsUpdated ?? data.updatedLeads ?? 0;
            totalSkipped += data.skippedDup ?? data.skippedLeads ?? 0;
            succeeded++;
            if ((data.leadsFound ?? data.newLeads ?? 0) > 0) {
              toast.success(`${config?.icon} ${source.displayName}: ${data.leadsFound ?? data.newLeads} new leads`);
            }
          } else {
            toast.error(`${config?.icon} ${source.displayName}: ${data.error}`);
          }
        } catch {
          toast.error(`${source.displayName}: Failed`);
        }

        setRunningSources((prev) => { const n = new Set(prev); n.delete(source.id); return n; });
      }

      const parts = [`${totalNew} new`];
      if (totalUpdated > 0) parts.push(`${totalUpdated} updated`);
      if (totalSkipped > 0) parts.push(`${totalSkipped} skipped`);
      toast.success(`Done! ${parts.join(", ")} from ${succeeded} sources`);

      // Refresh sources, plan info, and run history
      await refreshSources();
      setRunsToday((prev) => prev + 1);
      fetch("/api/scraping/run-groups?limit=5").then((r) => r.json()).then(setRunHistory);
    } catch {
      toast.error("Run failed");
    } finally {
      setRunningAll(false);
    }
  }

  async function scoreLeads() {
    setScoring(true);
    try {
      const res = await fetch("/api/leads/score-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Scoring failed"); return; }
      toast.success(`Scored ${data.scored}, matched ${data.matched}${data.remaining > 0 ? ` (${data.remaining} remaining — click again)` : ""}`);
    } catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  }

  async function toggleSource(id: string, isActive: boolean) {
    try {
      await fetch(`/api/scraping/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)));
    } catch { toast.error("Failed to toggle"); }
  }

  async function deleteSource(id: string) {
    try {
      await fetch(`/api/scraping/sources/${id}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success("Source removed");
    } catch { toast.error("Failed to delete"); }
  }

  async function addSource() {
    try {
      const res = await fetch("/api/scraping/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSource,
          keywords: newSource.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSources((prev) => [data, ...prev]);
        setAddOpen(false);
        setNewSource({ platform: "", identifier: "", displayName: "", keywords: "" });
        toast.success("Source added!");
      } else {
        toast.error(data.error ?? "Failed to add source");
      }
    } catch { toast.error("Failed to add source"); }
  }

  const grouped = {
    social: sources.filter((s) => ["REDDIT", "FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN", "TELEGRAM"].includes(s.platform)),
    portals: sources.filter((s) => ["NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "COMMONFLOOR"].includes(s.platform)),
    other: sources.filter((s) => ["GOOGLE_MAPS", "YOUTUBE", "QUORA"].includes(s.platform)),
  };

  const totalLeads = sources.reduce((sum, s) => sum + (s.lastRunLeads ?? 0), 0);
  const activeSources = sources.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="sources-header" className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Lead Sources</h1>
            <Badge variant={tier === "FREE" ? "secondary" : tier === "PRO" ? "default" : "outline"} className="text-xs">
              {tier} Plan
            </Badge>
            <span className="text-sm text-zinc-500">
              {runsToday}/{maxRuns} runs today
            </span>
          </div>
          <p className="text-sm text-zinc-500">
            {activeSources} active / {sources.length} total sources · {totalLeads} leads last run
          </p>
        </div>
        <div className="flex gap-2">
          <Button data-tour="run-all" variant="outline" onClick={runAll} disabled={runningAll}>
            {runningAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {runningAll ? "Running..." : "Run All Sources"}
          </Button>
          <Button data-tour="score-match" variant="outline" onClick={scoreLeads} disabled={scoring}>
            {scoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {scoring ? "Scoring..." : "Score & Match"}
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger data-tour="add-source" render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> Add Source
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Scraping Source</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Platform</Label>
                  <Select onValueChange={(v) => setNewSource((p) => ({ ...p, platform: String(v ?? "") }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platformOptions.map((p) => (
                        <SelectItem key={p} value={p}>
                          {platformConfig[p]?.icon} {platformConfig[p]?.label ?? p}
                          {platformConfig[p]?.requiresApify && " (Apify)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newSource.platform && platformConfig[newSource.platform] && (
                    <p className="text-xs text-zinc-500 mt-1">{platformConfig[newSource.platform].description}</p>
                  )}
                </div>
                <div>
                  <Label>Identifier</Label>
                  <Input placeholder="e.g., hyderabad (subreddit), group ID" value={newSource.identifier}
                    onChange={(e) => setNewSource((p) => ({ ...p, identifier: e.target.value }))} />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input placeholder="e.g., r/hyderabad, 99acres Hyderabad" value={newSource.displayName}
                    onChange={(e) => setNewSource((p) => ({ ...p, displayName: e.target.value }))} />
                </div>
                <div>
                  <Label>Keywords (comma-separated)</Label>
                  <Input placeholder="flat, apartment, 2BHK, property, gachibowli" value={newSource.keywords}
                    onChange={(e) => setNewSource((p) => ({ ...p, keywords: e.target.value }))} />
                </div>
                <Button onClick={addSource} className="w-full">Add Source</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center py-20 border-2 border-dashed rounded-xl">
          <Globe className="mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-500">No sources configured</p>
          <p className="text-sm text-zinc-400">Sources will be auto-seeded when you reload</p>
        </div>
      ) : (
        <div data-tour="source-grid" className="space-y-8">
          {[
            { title: "Social Media & Forums", sources: grouped.social },
            { title: "Real Estate Portals", sources: grouped.portals },
            { title: "Other Sources", sources: grouped.other },
          ].filter((g) => g.sources.length > 0).map((group) => (
            <section key={group.title}>
              <h2 className="text-lg font-semibold mb-3">{group.title}</h2>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {group.sources.map((s) => (
                  <SourceCard
                    key={s.id}
                    source={s}
                    tier={tier}
                    isRunning={runningSources.has(s.id)}
                    onRun={() => runSource(s.id, s.displayName)}
                    onToggle={() => toggleSource(s.id, s.isActive)}
                    onDelete={() => deleteSource(s.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Run History */}
      {runHistory.length > 0 && (
        <div data-tour="run-history" className="space-y-3">
          <h2 className="text-lg font-semibold">Run History</h2>
          {runHistory.map((group: any) => (
            <RunHistoryCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function SourceCard({
  source: s, tier, isRunning, onRun, onToggle, onDelete,
}: {
  source: any; tier: string; isRunning: boolean; onRun: () => void; onToggle: () => void; onDelete: () => void;
}) {
  const config = platformConfig[s.platform];
  const requiresApify = config?.requiresApify ?? false;
  const lastRun = s.runs?.[0];
  const lastStatus = lastRun?.status;
  const isLocked = !(TIER_PLATFORMS[tier] ?? TIER_PLATFORMS.FREE).includes(s.platform);

  return (
    <Card className={cn(
      "relative transition-all",
      !s.isActive && "opacity-50",
      isRunning && "ring-2 ring-blue-400",
      isLocked && "opacity-60",
    )}>
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900/60 rounded-xl backdrop-blur-[2px]">
          <Lock className="h-6 w-6 text-zinc-300 mb-1" />
          <span className="text-xs font-medium text-zinc-300">Upgrade to unlock</span>
        </div>
      )}
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config?.icon ?? "🌐"}</span>
            <CardTitle className="text-base truncate">{s.displayName}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px]">{config?.label ?? s.platform}</Badge>
            {requiresApify && <Badge variant="secondary" className="text-[10px]">Apify</Badge>}
            {!requiresApify && s.platform === "REDDIT" && <Badge variant="default" className="text-[10px] bg-green-600">Free</Badge>}
            {!requiresApify && s.platform === "COMMONFLOOR" && <Badge variant="default" className="text-[10px] bg-green-600">Free</Badge>}
            {lastStatus === "COMPLETED" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            )}
            {lastStatus === "FAILED" && (
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-blue-500"
            onClick={onRun}
            disabled={isRunning || !s.isActive || isLocked}
            title={isLocked ? "Upgrade to unlock this platform" : "Run this source"}
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Switch checked={s.isActive} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {s.keywords?.slice(0, 5).map((k: string) => (
            <Badge key={k} variant="outline" className="text-[10px] px-1.5 py-0">{k}</Badge>
          ))}
          {(s.keywords?.length ?? 0) > 5 && (
            <Badge variant="outline" className="text-[10px] text-zinc-400">+{s.keywords.length - 5}</Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "Never run"}</span>
          </div>
          <span className="font-medium">{s.lastRunLeads ?? 0} leads</span>
        </div>
        {s.runs?.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            {s.runs.slice(0, 2).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">{new Date(r.startedAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <span>{r.postsScanned} scanned</span>
                  <span className="font-medium">{r.leadsFound} leads</span>
                  <Badge
                    variant={r.status === "COMPLETED" ? "default" : r.status === "FAILED" ? "destructive" : "secondary"}
                    className="text-[9px] px-1"
                  >
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RunHistoryCard({ group }: { group: any }) {
  const [expanded, setExpanded] = useState(false);
  const totalNew = group.runs?.reduce((sum: number, r: any) => sum + (r.newLeads ?? r.leadsFound ?? 0), 0) ?? 0;
  const totalUpdated = group.runs?.reduce((sum: number, r: any) => sum + (r.updatedLeads ?? 0), 0) ?? 0;
  const statusCounts = (group.runs ?? []).reduce(
    (acc: Record<string, number>, r: any) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );
  const allCompleted = statusCounts.COMPLETED === (group.runs?.length ?? 0);
  const hasFailed = (statusCounts.FAILED ?? 0) > 0;

  return (
    <Card>
      <CardHeader
        className="flex flex-row items-center justify-between py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4 text-zinc-400" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
          <Badge
            variant={allCompleted ? "default" : hasFailed ? "destructive" : "secondary"}
            className="text-[10px]"
          >
            {allCompleted ? "COMPLETED" : hasFailed ? "PARTIAL" : group.status ?? "RUNNING"}
          </Badge>
          <span className="text-sm text-zinc-500">
            {group.startedAt ? new Date(group.startedAt).toLocaleString() : "Unknown"}
          </span>
          <Badge variant="outline" className="text-[10px]">{group.tier ?? "FREE"}</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-green-600">{totalNew} new</span>
          {totalUpdated > 0 && <span className="text-zinc-500">{totalUpdated} updated</span>}
          <span className="text-zinc-400">{group.runs?.length ?? 0} sources</span>
        </div>
      </CardHeader>
      {expanded && group.runs?.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <div className="space-y-1.5 border-t pt-2">
            {group.runs.map((run: any) => {
              const config = platformConfig[run.source?.platform];
              return (
                <div key={run.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span>{config?.icon ?? "🌐"}</span>
                    <span className="font-medium">{run.source?.displayName ?? run.sourceId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{run.postsScanned ?? 0} scanned</span>
                    <span className="font-medium text-green-600">{run.newLeads ?? run.leadsFound ?? 0} new</span>
                    {(run.updatedLeads ?? 0) > 0 && <span className="text-zinc-500">{run.updatedLeads} updated</span>}
                    {(run.skippedLeads ?? 0) > 0 && <span className="text-zinc-400">{run.skippedLeads} skipped</span>}
                    <Badge
                      variant={run.status === "COMPLETED" ? "default" : run.status === "FAILED" ? "destructive" : "secondary"}
                      className="text-[9px] px-1"
                    >
                      {run.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
