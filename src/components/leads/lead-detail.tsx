"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreBadge } from "./score-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ExternalLink, RefreshCw, MessageSquare, Mail, Phone, Loader2, Sparkles, Building2, Briefcase, CheckCircle, Link2, StickyNote, Pencil, ArrowLeft, Calendar, Home } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils/format";

export function LeadDetail({ lead: initialLead }: { lead: any }) {
  const router = useRouter();
  const [leadData, setLeadData] = useState(initialLead);
  const lead = leadData;
  const [scoring, setScoring] = useState(false);
  const [matching, setMatching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [clustering, setClustering] = useState(false);
  const [notes, setNotes] = useState(initialLead.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editingScore, setEditingScore] = useState(false);
  const [manualScore, setManualScore] = useState(String(initialLead.score ?? 0));
  const [savingScore, setSavingScore] = useState(false);

  async function refreshLead() {
    try {
      const res = await fetch(`/api/leads/${lead.id}`);
      if (res.ok) setLeadData(await res.json());
    } catch {}
  }

  async function rescore() {
    setScoring(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/score`, { method: "POST" });
      if (res.ok) { toast.success("Lead re-scored!"); await refreshLead(); }
    } catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  }

  async function rematch() {
    setMatching(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/match`, { method: "POST" });
      if (res.ok) { toast.success("Properties matched!"); await refreshLead(); }
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
        await refreshLead();
      } else {
        toast.error(data.error ?? "Enrichment failed");
      }
    } catch { toast.error("Enrichment failed"); }
    finally { setEnriching(false); }
  }

  const platformLabels: Record<string, string> = {
    REDDIT: "Reddit", FACEBOOK: "Facebook", TWITTER: "X / Twitter", INSTAGRAM: "Instagram",
    LINKEDIN: "LinkedIn", YOUTUBE: "YouTube", QUORA: "Quora", TELEGRAM: "Telegram",
    NINETY_NINE_ACRES: "99acres", MAGICBRICKS: "MagicBricks", NOBROKER: "NoBroker",
    COMMONFLOOR: "CommonFloor", GOOGLE_MAPS: "Google Maps",
  };
  const statusLabels: Record<string, string> = {
    NEW: "New", CONTACTED: "Contacted", ENGAGED: "Engaged", NURTURE: "Nurture",
    SITE_VISIT: "Site Visit", NEGOTIATION: "Negotiation", CONVERTED: "Converted", LOST: "Lost",
  };

  function formatBudgetRange(min: number | null, max: number | null) {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
      if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
      return `₹${n.toLocaleString("en-IN")}`;
    };
    if (min && max) return `₹${fmt(min)} - ₹${fmt(max)}`;
    if (min) return `₹${fmt(min)}+`;
    if (max) return `Up to ₹${fmt(max)}`;
    return null;
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-zinc-500" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{lead.name ?? "Unknown Lead"}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">{platformLabels[lead.platform] ?? lead.platform}</Badge>
            <Select value={lead.status} onValueChange={async (v) => {
              if (!v) return;
              try {
                const res = await fetch(`/api/leads/${lead.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: v }),
                });
                if (res.ok) { toast.success(`Status changed to ${statusLabels[v] ?? v}`); await refreshLead(); }
                else toast.error("Failed to update status");
              } catch { toast.error("Failed to update status"); }
            }}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lead.sourceUrl && (
              <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-400">
            {lead.createdAt && <span>Added {formatRelativeTime(lead.createdAt)}</span>}
            {lead.lastSeenAt && <span>Last seen {formatRelativeTime(lead.lastSeenAt)}</span>}
            {lead.propertyType && (
              <span className="flex items-center gap-0.5"><Home className="h-3 w-3" /> {lead.propertyType}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingScore ? (
            <div className="flex items-center gap-1.5">
              <Input type="number" min={0} max={100} value={manualScore} onChange={(e) => setManualScore(e.target.value)} className="w-16 h-8 text-sm text-center" />
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={savingScore} onClick={async () => {
                const s = Number(manualScore);
                if (isNaN(s) || s < 0 || s > 100) { toast.error("Score must be 0-100"); return; }
                setSavingScore(true);
                try {
                  const res = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: s }) });
                  if (res.ok) { toast.success("Score updated"); setEditingScore(false); await refreshLead(); }
                  else toast.error("Failed to update score");
                } catch { toast.error("Failed to update score"); }
                finally { setSavingScore(false); }
              }}>
                {savingScore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditingScore(false); setManualScore(String(lead.score ?? 0)); }}>Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setEditingScore(true)} className="group relative" title="Click to manually override score">
              <ScoreBadge score={lead.score} tier={lead.tier} />
              <Pencil className="absolute -top-1 -right-1 h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={rescore} disabled={scoring}>
          {scoring ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />} Re-score
        </Button>
        <Button size="sm" variant="outline" onClick={rematch} disabled={matching}>
          {matching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Match Properties
        </Button>
        {lead.phone && (
          <Button size="sm" variant="outline" onClick={() => {
            let phone = lead.phone.replace(/[^0-9]/g, "");
            if (phone.length === 10) phone = "91" + phone;
            const msg = encodeURIComponent(`Hi ${lead.name ?? ""}, I noticed you were looking for a property. I'd love to help!`);
            window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
          }}><Phone className="mr-1 h-3 w-3" /> WhatsApp</Button>
        )}
        {lead.email && (
          <Button size="sm" variant="outline" onClick={() => {
            const subject = encodeURIComponent(`Property options for you`);
            const body = encodeURIComponent(`Hi ${lead.name ?? ""},\n\nI noticed you were looking for a property. I'd love to share some options with you.\n\nBest regards`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`);
          }}><Mail className="mr-1 h-3 w-3" /> Email</Button>
        )}
        <Button size="sm" variant="outline" onClick={enrichContact} disabled={enriching}
          title="Find email, phone, and company info (Pro plan)">
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
        <Button size="sm" onClick={() => router.push(`/coach?leadId=${lead.id}`)}><MessageSquare className="mr-1 h-3 w-3" /> AI Coach</Button>
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
                  <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 transition-colors">
                    <Badge variant="outline" className="text-[10px]">{platformLabels[l.platform] ?? l.platform}</Badge>
                    <span>{l.name ?? "Unknown"}</span>
                    <span className="text-zinc-400">Score: {l.score}</span>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-medium">Notes</p>
          </div>
          <Textarea
            placeholder="Add notes about this lead... (e.g., spoke to wife, wants Vastu-compliant, referred by Ramesh)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          {notes !== (lead.notes ?? "") && (
            <Button size="sm" className="mt-2" disabled={savingNotes} onClick={async () => {
              setSavingNotes(true);
              try {
                const res = await fetch(`/api/leads/${lead.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ notes }),
                });
                if (res.ok) { toast.success("Notes saved"); await refreshLead(); }
                else toast.error("Failed to save notes");
              } catch { toast.error("Failed to save notes"); }
              finally { setSavingNotes(false); }
            }}>
              {savingNotes ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Save Notes
            </Button>
          )}
        </CardContent>
      </Card>

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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Budget</p>
                <p className="font-medium">{lead.budget ?? "Not specified"}</p>
                {formatBudgetRange(lead.budgetMin, lead.budgetMax) && (
                  <p className="text-xs text-zinc-400 mt-0.5">Range: {formatBudgetRange(lead.budgetMin, lead.budgetMax)}</p>
                )}
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
                <p className="font-medium">{lead.buyerPersona?.replace(/_/g, " ") ?? "Unknown"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">Property Type</p>
                <p className="font-medium">{lead.propertyType ?? "Not specified"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-zinc-500 mb-1">First Seen</p>
                <p className="font-medium">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Unknown"}</p>
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
                <p className="text-sm font-medium">{e.channel?.replace(/_/g, " ")} · {e.direction?.replace(/_/g, " ")}</p>
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
