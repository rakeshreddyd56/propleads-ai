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
import { Globe, Play, Plus, Loader2, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const platformConfig: Record<string, { label: string; icon: string; requiresApify: boolean; description: string }> = {
  REDDIT: { label: "Reddit", icon: "🔴", requiresApify: false, description: "Public JSON endpoints, no API key needed" },
  FACEBOOK: { label: "Facebook", icon: "📘", requiresApify: true, description: "Facebook Groups via Apify" },
  TWITTER: { label: "X / Twitter", icon: "🐦", requiresApify: true, description: "Tweet search via Apify" },
  QUORA: { label: "Quora", icon: "❓", requiresApify: true, description: "Property Q&A via Apify" },
  GOOGLE_MAPS: { label: "Google Maps", icon: "📍", requiresApify: true, description: "Agent/builder reviews via Apify" },
  NINETY_NINE_ACRES: { label: "99acres", icon: "🏠", requiresApify: true, description: "Property portal via Apify" },
  MAGICBRICKS: { label: "MagicBricks", icon: "🧱", requiresApify: true, description: "Property portal via Apify" },
  NOBROKER: { label: "NoBroker", icon: "🔑", requiresApify: true, description: "Direct owner listings via Apify" },
  COMMONFLOOR: { label: "CommonFloor", icon: "🏢", requiresApify: false, description: "Society forums via Firecrawl" },
  INSTAGRAM: { label: "Instagram", icon: "📸", requiresApify: true, description: "Property hashtags via Apify" },
  LINKEDIN: { label: "LinkedIn", icon: "💼", requiresApify: true, description: "Professional posts via Apify" },
  YOUTUBE: { label: "YouTube", icon: "▶️", requiresApify: true, description: "Video comments via Apify" },
  TELEGRAM: { label: "Telegram", icon: "✈️", requiresApify: true, description: "Group messages via Apify" },
};

const platformOptions = Object.keys(platformConfig);

export default function ScrapingPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newSource, setNewSource] = useState({ platform: "", identifier: "", displayName: "", keywords: "" });

  useEffect(() => {
    fetch("/api/scraping/sources")
      .then((r) => r.json())
      .then(setSources)
      .finally(() => setLoading(false));
  }, []);

  async function scoreLeads() {
    setScoring(true);
    try {
      const res = await fetch("/api/leads/score-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Scoring failed");
        return;
      }
      toast.success(`Scored ${data.scored} leads, matched ${data.matched}${data.remaining > 0 ? ` (${data.remaining} remaining)` : ""}`);
    } catch {
      toast.error("Failed to score leads");
    } finally {
      setScoring(false);
    }
  }

  async function triggerScrape() {
    setTriggering(true);
    const activeSources = sources.filter((s) => s.isActive);
    if (activeSources.length === 0) {
      toast.error("No active sources to scrape");
      setTriggering(false);
      return;
    }

    let totalLeads = 0;
    let succeeded = 0;
    let failed = 0;

    // Process each source one by one — each gets its own 60s API call
    for (const source of activeSources) {
      const config = platformConfig[source.platform];
      toast.info(`Scraping ${config?.icon ?? ""} ${source.displayName}...`);

      try {
        const res = await fetch("/api/scraping/run-source", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: source.id }),
        });
        const data = await res.json();

        if (data.error) {
          failed++;
          // Don't spam toast for expected Apify errors
          if (!data.error.includes("APIFY_API_TOKEN")) {
            toast.error(`${source.displayName}: ${data.error}`);
          }
        } else {
          totalLeads += data.leadsFound ?? 0;
          succeeded++;
          if (data.leadsFound > 0) {
            toast.success(`${config?.icon ?? ""} ${source.displayName}: ${data.leadsFound} leads found`);
          }
        }
      } catch {
        failed++;
      }
    }

    // Final summary
    if (totalLeads > 0) {
      toast.success(`Done! ${totalLeads} leads from ${succeeded} sources`);
    } else if (succeeded > 0) {
      toast.info(`Scraped ${succeeded} sources — no new leads found`);
    } else {
      toast.error("All sources failed");
    }

    // Refresh sources list
    const sourcesRes = await fetch("/api/scraping/sources");
    if (sourcesRes.ok) setSources(await sourcesRes.json());
    setTriggering(false);
  }

  async function toggleSource(id: string, isActive: boolean) {
    try {
      await fetch(`/api/scraping/sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)));
    } catch {
      toast.error("Failed to toggle source");
    }
  }

  async function deleteSource(id: string) {
    try {
      await fetch(`/api/scraping/sources/${id}`, { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success("Source removed");
    } catch {
      toast.error("Failed to delete source");
    }
  }

  async function addSource() {
    try {
      const res = await fetch("/api/scraping/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSource,
          keywords: newSource.keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        const source = await res.json();
        setSources((prev) => [source, ...prev]);
        setAddOpen(false);
        setNewSource({ platform: "", identifier: "", displayName: "", keywords: "" });
        toast.success("Source added!");
      }
    } catch {
      toast.error("Failed to add source");
    }
  }

  // Group sources by category
  const grouped = {
    social: sources.filter((s) => ["REDDIT", "FACEBOOK", "TWITTER", "INSTAGRAM", "LINKEDIN", "TELEGRAM"].includes(s.platform)),
    portals: sources.filter((s) => ["NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "COMMONFLOOR"].includes(s.platform)),
    other: sources.filter((s) => ["GOOGLE_MAPS", "YOUTUBE", "QUORA"].includes(s.platform)),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Sources</h1>
          <p className="text-sm text-zinc-500">
            {sources.length} sources across {new Set(sources.map((s: any) => s.platform)).size} platforms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={triggerScrape} disabled={triggering}>
            {triggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {triggering ? "Scraping..." : "Run All Now"}
          </Button>
          <Button variant="outline" onClick={scoreLeads} disabled={scoring}>
            {scoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            {scoring ? "Scoring..." : "Score & Match Leads"}
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button />}>
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
                  <Input
                    placeholder="e.g., hyderabad (subreddit), group ID, search query"
                    value={newSource.identifier}
                    onChange={(e) => setNewSource((p) => ({ ...p, identifier: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input
                    placeholder="e.g., r/hyderabad, 99acres Hyderabad"
                    value={newSource.displayName}
                    onChange={(e) => setNewSource((p) => ({ ...p, displayName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Keywords (comma-separated)</Label>
                  <Input
                    placeholder="flat, apartment, 2BHK, property, gachibowli"
                    value={newSource.keywords}
                    onChange={(e) => setNewSource((p) => ({ ...p, keywords: e.target.value }))}
                  />
                </div>
                <Button onClick={addSource} className="w-full">
                  Add Source
                </Button>
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
        <div className="space-y-8">
          {/* Social & Forums */}
          {grouped.social.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Social Media & Forums</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grouped.social.map((s) => (
                  <SourceCard
                    key={s.id}
                    source={s}
                    onToggle={() => toggleSource(s.id, s.isActive)}
                    onDelete={() => deleteSource(s.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Real Estate Portals */}
          {grouped.portals.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Real Estate Portals</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grouped.portals.map((s) => (
                  <SourceCard
                    key={s.id}
                    source={s}
                    onToggle={() => toggleSource(s.id, s.isActive)}
                    onDelete={() => deleteSource(s.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Other Sources */}
          {grouped.other.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Other Sources</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {grouped.other.map((s) => (
                  <SourceCard
                    key={s.id}
                    source={s}
                    onToggle={() => toggleSource(s.id, s.isActive)}
                    onDelete={() => deleteSource(s.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SourceCard({ source: s, onToggle, onDelete }: { source: any; onToggle: () => void; onDelete: () => void }) {
  const config = platformConfig[s.platform];
  const requiresApify = config?.requiresApify ?? false;

  return (
    <Card className={!s.isActive ? "opacity-60" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{config?.icon ?? "🌐"}</span>
            <CardTitle className="text-base truncate">{s.displayName}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-[10px]">
              {config?.label ?? s.platform}
            </Badge>
            {requiresApify && (
              <Badge variant="secondary" className="text-[10px]">
                Apify
              </Badge>
            )}
            {!requiresApify && s.platform === "REDDIT" && (
              <Badge variant="default" className="text-[10px] bg-green-600">
                Free
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-500" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Switch checked={s.isActive} onCheckedChange={onToggle} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {s.keywords?.slice(0, 6).map((k: string) => (
            <Badge key={k} variant="outline" className="text-xs">
              {k}
            </Badge>
          ))}
          {(s.keywords?.length ?? 0) > 6 && (
            <Badge variant="outline" className="text-xs text-zinc-400">
              +{s.keywords.length - 6}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Last: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "Never"}</span>
          <span>{s.lastRunLeads ?? 0} leads</span>
        </div>
        {s.runs?.length > 0 && (
          <div className="space-y-1">
            {s.runs.slice(0, 3).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">{new Date(r.startedAt).toLocaleString()}</span>
                <div className="flex items-center gap-2">
                  <span>{r.postsScanned} scanned</span>
                  <span className="font-medium">{r.leadsFound} leads</span>
                  <Badge
                    variant={r.status === "COMPLETED" ? "default" : r.status === "FAILED" ? "destructive" : "secondary"}
                    className="text-[10px]"
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
