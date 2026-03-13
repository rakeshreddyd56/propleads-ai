"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "./score-badge";
import { ExternalLink, RefreshCw, MessageSquare, Mail, Phone, Loader2, Sparkles, Building2, Briefcase, CheckCircle, Link2 } from "lucide-react";
import { toast } from "sonner";

export function LeadDetail({ lead }: { lead: any }) {
  const [scoring, setScoring] = useState(false);
  const [matching, setMatching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [clustering, setClustering] = useState(false);

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

  async function enrichContact() {
    setEnriching(true);
    try {
      const res = await fetch("/api/leads/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (res.ok) {
        const found = [data.email && "email", data.phone && "phone", data.company && "company"].filter(Boolean);
        toast.success(found.length > 0 ? `Found: ${found.join(", ")}` : "No new contact info found");
      } else {
        toast.error(data.error ?? "Enrichment failed");
      }
    } catch { toast.error("Enrichment failed"); }
    finally { setEnriching(false); }
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
        <Button size="sm" variant="outline" onClick={enrichContact} disabled={enriching}>
          {enriching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />} Enrich Contact
        </Button>
        <Button size="sm" variant="outline" onClick={async () => {
          setClustering(true);
          try {
            const res = await fetch("/api/leads/cluster", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ leadId: lead.id }),
            });
            const data = await res.json();
            if (res.ok && data.clustered) {
              toast.success(`Linked with ${data.cluster?.leads?.length ?? 0} leads across platforms`);
            } else if (res.ok) {
              toast.info("No cross-platform match found");
            } else {
              toast.error(data.error ?? "Clustering failed");
            }
          } catch { toast.error("Clustering failed"); }
          finally { setClustering(false); }
        }} disabled={clustering}>
          {clustering ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Link2 className="mr-1 h-3 w-3" />} Find Duplicates
        </Button>
        <Button size="sm"><MessageSquare className="mr-1 h-3 w-3" /> AI Coach</Button>
      </div>

      {/* Cross-platform cluster info */}
      {lead.cluster && lead.cluster.leads?.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-indigo-500" />
              <p className="text-sm font-medium">Also seen on</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {lead.cluster.leads
                .filter((l: any) => l.id !== lead.id)
                .map((l: any) => (
                  <a key={l.id} href={`/leads/${l.id}`} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors">
                    <Badge variant="outline" className="text-[10px]">{l.platform}</Badge>
                    <span>{l.name ?? "Unknown"}</span>
                    <span className="text-zinc-400">Score: {l.score}</span>
                  </a>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

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

        <TabsContent value="enriched" className="mt-4 space-y-4">
          {lead.enrichedAt ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {lead.email && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-xs text-zinc-500">Email</p>
                        <p className="font-medium text-sm">{lead.email}</p>
                        {(lead.enrichedData as any)?.emailVerified && (
                          <span className="text-xs text-green-600 flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /> Verified</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {lead.phone && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Phone className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-xs text-zinc-500">Phone</p>
                        <p className="font-medium text-sm">{lead.phone}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {lead.company && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-purple-500" />
                      <div>
                        <p className="text-xs text-zinc-500">Company</p>
                        <p className="font-medium text-sm">{lead.company}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {lead.jobTitle && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-amber-500" />
                      <div>
                        <p className="text-xs text-zinc-500">Job Title</p>
                        <p className="font-medium text-sm">{lead.jobTitle}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              <p className="text-xs text-zinc-400">
                Enriched {new Date(lead.enrichedAt).toLocaleDateString()} via {lead.enrichmentSource ?? "auto"}
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">Not enriched yet</p>
              <p className="text-xs text-zinc-400 mt-1">Click "Enrich Contact" to find email, phone, and company info</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
