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
import { Globe, Play, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const platformOptions = [
  "REDDIT", "FACEBOOK", "TWITTER", "QUORA", "GOOGLE_MAPS",
  "NINETY_NINE_ACRES", "MAGICBRICKS", "NOBROKER", "COMMONFLOOR",
  "INSTAGRAM", "LINKEDIN", "YOUTUBE", "TELEGRAM",
];

export default function ScrapingPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newSource, setNewSource] = useState({ platform: "", identifier: "", displayName: "", keywords: "" });

  useEffect(() => {
    fetch("/api/scraping/sources")
      .then(r => r.json())
      .then(setSources)
      .finally(() => setLoading(false));
  }, []);

  async function triggerScrape() {
    setTriggering(true);
    try {
      const res = await fetch("/api/scraping/trigger", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Scraping failed");
        return;
      }
      const failed = data.results?.filter((r: any) => r.error) ?? [];
      if (failed.length > 0) {
        toast.error(`${failed.length} source(s) failed: ${failed[0].error}`);
      } else {
        toast.success(`Scraped ${data.sourcesProcessed} sources — ${data.totalLeads} leads found`);
      }
      // Refresh sources to show updated run history
      const sourcesRes = await fetch("/api/scraping/sources");
      if (sourcesRes.ok) setSources(await sourcesRes.json());
    } catch { toast.error("Failed to trigger"); }
    finally { setTriggering(false); }
  }

  async function addSource() {
    try {
      const res = await fetch("/api/scraping/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSource,
          keywords: newSource.keywords.split(",").map(k => k.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const source = await res.json();
        setSources(prev => [source, ...prev]);
        setAddOpen(false);
        setNewSource({ platform: "", identifier: "", displayName: "", keywords: "" });
        toast.success("Source added!");
      }
    } catch { toast.error("Failed to add source"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Sources</h1>
          <p className="text-sm text-zinc-500">{sources.length} configured sources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={triggerScrape} disabled={triggering}>
            {triggering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run Now
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button />}>
              <Plus className="mr-2 h-4 w-4" /> Add Source
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Scraping Source</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Platform</Label>
                  <Select onValueChange={(v) => setNewSource(p => ({ ...p, platform: String(v ?? "") }))}>
                    <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                    <SelectContent>
                      {platformOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Identifier</Label>
                  <Input placeholder="e.g., hyderabad (subreddit name)" value={newSource.identifier} onChange={(e) => setNewSource(p => ({ ...p, identifier: e.target.value }))} />
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input placeholder="e.g., r/hyderabad" value={newSource.displayName} onChange={(e) => setNewSource(p => ({ ...p, displayName: e.target.value }))} />
                </div>
                <div>
                  <Label>Keywords (comma-separated)</Label>
                  <Input placeholder="flat, apartment, 2BHK, property" value={newSource.keywords} onChange={(e) => setNewSource(p => ({ ...p, keywords: e.target.value }))} />
                </div>
                <Button onClick={addSource} className="w-full">Add Source</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center py-20 border-2 border-dashed rounded-xl">
          <Globe className="mb-4 h-12 w-12 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-500">No sources configured</p>
          <p className="text-sm text-zinc-400">Add Reddit, Facebook, or other sources to start scraping leads</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sources.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{s.displayName}</CardTitle>
                  <p className="text-xs text-zinc-500">{s.platform} · {s.identifier}</p>
                </div>
                <Switch checked={s.isActive} />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {s.keywords?.map((k: string) => <Badge key={k} variant="outline" className="text-xs">{k}</Badge>)}
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Last run: {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString() : "Never"}</span>
                  <span>{s.lastRunLeads} leads found</span>
                </div>
                {s.runs?.length > 0 && (
                  <div className="space-y-1">
                    {s.runs.slice(0, 3).map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-xs">
                        <span>{new Date(r.startedAt).toLocaleString()}</span>
                        <div className="flex items-center gap-2">
                          <span>{r.postsScanned} scanned</span>
                          <span>{r.leadsFound} leads</span>
                          <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "FAILED" ? "destructive" : "secondary"} className="text-xs">{r.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
