"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "./score-badge";
import { ExternalLink, RefreshCw, MessageSquare, Mail, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LeadDetail({ lead }: { lead: any }) {
  const [scoring, setScoring] = useState(false);
  const [matching, setMatching] = useState(false);

  async function rescore() {
    setScoring(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/score`, { method: "POST" });
      if (res.ok) toast.success("Lead re-scored!");
    } catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  }

  async function rematch() {
    setMatching(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/match`, { method: "POST" });
      if (res.ok) toast.success("Properties matched!");
    } catch { toast.error("Matching failed"); }
    finally { setMatching(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.name ?? "Unknown Lead"}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">{lead.platform}</Badge>
            <Badge variant={lead.status === "NEW" ? "default" : "secondary"}>{lead.status}</Badge>
            {lead.sourceUrl && (
              <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <ScoreBadge score={lead.score} tier={lead.tier} />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={rescore} disabled={scoring}>
          {scoring ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />} Re-score
        </Button>
        <Button size="sm" variant="outline" onClick={rematch} disabled={matching}>
          {matching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Match Properties
        </Button>
        {lead.phone && (
          <Button size="sm" variant="outline"><Phone className="mr-1 h-3 w-3" /> WhatsApp</Button>
        )}
        {lead.email && (
          <Button size="sm" variant="outline"><Mail className="mr-1 h-3 w-3" /> Email</Button>
        )}
        <Button size="sm"><MessageSquare className="mr-1 h-3 w-3" /> AI Coach</Button>
      </div>

      <Tabs defaultValue="intent">
        <TabsList>
          <TabsTrigger value="intent">Intent</TabsTrigger>
          <TabsTrigger value="matches">Matches ({lead.matches?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="outreach">Outreach ({lead.outreachEvents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="enriched">Enriched Data</TabsTrigger>
        </TabsList>

        <TabsContent value="intent" className="space-y-4 mt-4">
          {lead.originalText && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Original Post</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{lead.originalText}</p></CardContent>
            </Card>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Budget</p>
                <p className="font-medium">{lead.budget ?? "Not specified"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Timeline</p>
                <p className="font-medium">{lead.timeline ?? "Not specified"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Preferred Areas</p>
                <div className="flex flex-wrap gap-1">
                  {lead.preferredArea?.map((a: string) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>) ?? <span className="text-sm text-zinc-400">None</span>}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Buyer Persona</p>
                <p className="font-medium">{lead.buyerPersona ?? "Unknown"}</p>
              </CardContent>
            </Card>
          </div>
          {lead.scoreBreakdown && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Score Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(lead.scoreBreakdown as Record<string, number>).map(([key, val]) => (
                    <div key={key} className="text-center">
                      <p className="text-lg font-bold">{val}</p>
                      <p className="text-xs text-zinc-500 capitalize">{key}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="matches" className="space-y-3 mt-4">
          {lead.matches?.length === 0 && <p className="text-sm text-zinc-400">No property matches yet. Click "Match Properties" to find matches.</p>}
          {lead.matches?.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="flex items-start justify-between p-4">
                <div>
                  <p className="font-medium">{m.property?.name}</p>
                  <p className="text-sm text-zinc-500">{m.property?.area} · {m.property?.propertyType}</p>
                  {m.aiSummary && <p className="mt-2 text-sm text-zinc-600">{m.aiSummary}</p>}
                  <div className="mt-2 flex gap-1">
                    {(m.matchReasons as string[])?.map((r: string) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">{m.matchScore}%</p>
                  <Badge variant="outline" className="text-xs">{m.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="outreach" className="space-y-3 mt-4">
          {lead.outreachEvents?.length === 0 && <p className="text-sm text-zinc-400">No outreach events yet.</p>}
          {lead.outreachEvents?.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{e.channel} · {e.direction}</p>
                <p className="text-xs text-zinc-500">{new Date(e.createdAt).toLocaleString()}</p>
              </div>
              <Badge variant={e.status === "SENT" ? "default" : e.status === "FAILED" ? "destructive" : "secondary"} className="text-xs">{e.status}</Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="enriched" className="mt-4">
          {lead.enrichedData ? (
            <Card>
              <CardContent className="p-4">
                <pre className="text-xs overflow-auto max-h-80">{JSON.stringify(lead.enrichedData, null, 2)}</pre>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-zinc-400">Not enriched yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
