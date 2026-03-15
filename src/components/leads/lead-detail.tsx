"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ExternalLink, RefreshCw, MessageSquare, Mail, Phone, Loader2, Sparkles, Building2, Briefcase, CheckCircle, Link2, StickyNote, Pencil, ArrowLeft, Home, IndianRupee, MapPin, Clock, User, Target } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const MAX_AREAS_SHOWN = 5;
const MAX_ORIGINAL_TEXT_LENGTH = 800;

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

const scoreLabels: Record<string, { label: string; description: string }> = {
  budget: { label: "Budget Signal", description: "How clearly they stated a budget" },
  social: { label: "Social Proof", description: "Profile credibility and engagement" },
  profile: { label: "Profile Match", description: "How well they match a buyer persona" },
  location: { label: "Location Fit", description: "Overlap with your service areas" },
  timeline: { label: "Timeline Urgency", description: "How soon they want to buy" },
  intent: { label: "Purchase Intent", description: "Strength of buying signals" },
  engagement: { label: "Engagement", description: "Response and interaction level" },
};

/** Strip web page chrome (nav elements, links, accessibility text) from scraped content */
function cleanOriginalText(text: string): string {
  if (!text) return "";
  const junkPatterns = [
    /Skip to (?:content|search|navigation|main)/gi,
    /\[Go to .+?\]\(.+?\)/g,
    /Sign [Ii]n/g,
    /Something went wrong\. Wait a moment and try again\./g,
    /Try again/g,
    /\+ \d+/g,
    /All related \(\d+\)/g,
    /Sort\s*\n\s*Recommended/g,
    /Originally Answered:.*$/gm,
    /Author has [\d.]+[KM]? answers? and [\d.]+[KM]? answer views/g,
    /Lives in .+ · /g,
    /Updated \d+[ymd]/g,
    /\[.+?\]\(https?:\/\/www\.quora\.com\/(?:topic|profile)\/.+?\)/g,
    /Profile photo for .+/g,
    /!\[.*?\]\(.*?\)/g,
  ];

  let cleaned = text;
  for (const pattern of junkPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  // Collapse multiple blank lines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

function formatBudgetRange(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(1).replace(/\.0$/, "")} Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, "")} L`;
    return `₹${n.toLocaleString("en-IN")}`;
  };
  if (min && max) {
    // Don't show "₹1 Cr - ₹1 Cr" — just show "₹1 Cr"
    if (min === max) return `₹${fmt(min)}`;
    return `₹${fmt(min)} – ₹${fmt(max)}`;
  }
  if (min) return `₹${fmt(min)}+`;
  if (max) return `Up to ₹${fmt(max)}`;
  return null;
}

function ScoreBar({ label, value, maxValue = 10, description }: { label: string; value: number; maxValue?: number; description: string }) {
  const pct = Math.min((value / maxValue) * 100, 100);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-zinc-300";
  const textColor = pct >= 70 ? "text-green-600" : pct >= 40 ? "text-amber-600" : "text-zinc-400";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-700">{label}</span>
        <span className={cn("text-xs font-bold tabular-nums", textColor)}>{value}/{maxValue}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-zinc-400">{description}</p>
    </div>
  );
}

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
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [showFullText, setShowFullText] = useState(false);

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

  const tierColor = lead.tier === "HOT" ? "bg-red-500" : lead.tier === "WARM" ? "bg-amber-500" : "bg-slate-400";
  const tierTextColor = lead.tier === "HOT" ? "text-red-600" : lead.tier === "WARM" ? "text-amber-600" : "text-zinc-500";
  const tierBg = lead.tier === "HOT" ? "bg-red-50 border-red-200" : lead.tier === "WARM" ? "bg-amber-50 border-amber-200" : "bg-zinc-50 border-zinc-200";

  const preferredAreas: string[] = lead.preferredArea ?? [];
  const visibleAreas = showAllAreas ? preferredAreas : preferredAreas.slice(0, MAX_AREAS_SHOWN);
  const hasMoreAreas = preferredAreas.length > MAX_AREAS_SHOWN;

  const cleanedText = lead.originalText ? cleanOriginalText(lead.originalText) : "";
  const isTextLong = cleanedText.length > MAX_ORIGINAL_TEXT_LENGTH;
  const displayText = showFullText ? cleanedText : cleanedText.slice(0, MAX_ORIGINAL_TEXT_LENGTH);

  const budgetDisplay = formatBudgetRange(lead.budgetMin, lead.budgetMax) ?? lead.budget ?? "Not specified";

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" className="gap-1 -ml-2 text-zinc-500" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back to Leads
      </Button>

      {/* ─── Lead Header Card ─── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: Name + metadata */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold truncate">{lead.name ?? "Unknown Lead"}</h1>
                <Badge variant="outline" className="shrink-0 text-xs">{platformLabels[lead.platform] ?? lead.platform}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
                {lead.createdAt && <span>Added {formatRelativeTime(lead.createdAt)}</span>}
                {lead.propertyType && (
                  <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {lead.propertyType}</span>
                )}
                {lead.sourceUrl && (
                  <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                    View source <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Status selector */}
              <div className="mt-3">
                <Select value={lead.status} onValueChange={async (v) => {
                  if (!v) return;
                  try {
                    const res = await fetch(`/api/leads/${lead.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: v }),
                    });
                    if (res.ok) { toast.success(`Status → ${statusLabels[v] ?? v}`); await refreshLead(); }
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
              </div>
            </div>

            {/* Right: Score + tier */}
            <div className={cn("flex flex-col items-center gap-1 px-4 py-3 rounded-xl border shrink-0", tierBg)}>
              {editingScore ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Input type="number" min={0} max={100} value={manualScore} onChange={(e) => setManualScore(e.target.value)} className="w-16 h-8 text-sm text-center" />
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" disabled={savingScore} onClick={async () => {
                      const s = Number(manualScore);
                      if (isNaN(s) || s < 0 || s > 100) { toast.error("Score must be 0-100"); return; }
                      setSavingScore(true);
                      try {
                        const res = await fetch(`/api/leads/${lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score: s }) });
                        if (res.ok) { toast.success("Score updated"); setEditingScore(false); await refreshLead(); }
                        else toast.error("Failed");
                      } catch { toast.error("Failed"); }
                      finally { setSavingScore(false); }
                    }}>
                      {savingScore ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { setEditingScore(false); setManualScore(String(lead.score ?? 0)); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setEditingScore(true)} className="group flex flex-col items-center" title="Click to edit score">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white", tierColor)}>
                    {lead.score ?? "?"}
                  </div>
                  <span className={cn("text-xs font-semibold mt-1", tierTextColor)}>{lead.tier ?? "UNSCORED"}</span>
                  <Pencil className="h-3 w-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Quick Summary Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="h-3.5 w-3.5 text-green-500" />
              <span className="text-[11px] text-zinc-500">Budget</span>
            </div>
            <p className="text-sm font-semibold">{budgetDisplay}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] text-zinc-500">Timeline</span>
            </div>
            <p className="text-sm font-semibold">{lead.timeline ?? "Not specified"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-[11px] text-zinc-500">Buyer Type</span>
            </div>
            <p className="text-sm font-semibold">{lead.buyerPersona?.replace(/_/g, " ").replace(/\bIt\b/g, "IT").replace(/\bNri\b/g, "NRI") ?? "Unknown"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[11px] text-zinc-500">Areas ({preferredAreas.length})</span>
            </div>
            {preferredAreas.length > 0 ? (
              <p className="text-sm font-semibold truncate">{preferredAreas.slice(0, 2).join(", ")}{preferredAreas.length > 2 ? ` +${preferredAreas.length - 2}` : ""}</p>
            ) : (
              <p className="text-sm text-zinc-400">None</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Actions ─── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary: Contact actions */}
        {lead.phone && (
          <Button size="sm" onClick={() => {
            let phone = lead.phone.replace(/[^0-9]/g, "");
            if (phone.length === 10) phone = "91" + phone;
            const msg = encodeURIComponent(`Hi ${lead.name ?? ""}, I noticed you were looking for a property. I'd love to help!`);
            window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
          }}><Phone className="mr-1.5 h-3.5 w-3.5" /> WhatsApp</Button>
        )}
        {lead.email && (
          <Button size="sm" onClick={() => {
            const subject = encodeURIComponent(`Property options for you`);
            const body = encodeURIComponent(`Hi ${lead.name ?? ""},\n\nI noticed you were looking for a property. I'd love to share some options with you.\n\nBest regards`);
            window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`);
          }}><Mail className="mr-1.5 h-3.5 w-3.5" /> Email</Button>
        )}
        <Button size="sm" onClick={() => router.push(`/coach?leadId=${lead.id}`)}><MessageSquare className="mr-1.5 h-3.5 w-3.5" /> AI Coach</Button>

        {/* Separator */}
        <div className="hidden sm:block h-5 w-px bg-zinc-200" />

        {/* Secondary: Admin actions */}
        <Button size="sm" variant="outline" onClick={rematch} disabled={matching}>
          {matching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Target className="mr-1 h-3 w-3" />} Match
        </Button>
        <Button size="sm" variant="outline" onClick={rescore} disabled={scoring}>
          {scoring ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />} Re-score
        </Button>
        <Button size="sm" variant="ghost" onClick={enrichContact} disabled={enriching} title="Find email, phone, company (Pro plan)">
          {enriching ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />} Enrich
        </Button>
        <Button size="sm" variant="ghost" onClick={async () => {
          setClustering(true);
          try {
            const res = await fetch("/api/leads/cluster", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ leadId: lead.id }),
            });
            const data = await res.json();
            if (res.ok && data.clustered) {
              toast.success(`Linked with ${data.cluster?.leads?.length ?? 0} leads`);
            } else if (res.ok) {
              toast.info("No cross-platform match found");
            } else {
              toast.error(data.error ?? "Failed");
            }
          } catch { toast.error("Failed"); }
          finally { setClustering(false); }
        }} disabled={clustering}>
          {clustering ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Link2 className="mr-1 h-3 w-3" />} Dedup
        </Button>
      </div>

      {/* Cross-platform cluster info */}
      {lead.cluster && lead.cluster.leads?.length > 1 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-indigo-500" />
              <p className="text-xs font-medium">Also seen on</p>
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

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="intent">
        <TabsList>
          <TabsTrigger value="intent">Intent & Details</TabsTrigger>
          <TabsTrigger value="matches">Matches ({lead.matches?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="outreach">Outreach ({lead.outreachEvents?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="enriched">Contact Info</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* ─── Intent Tab ─── */}
        <TabsContent value="intent" className="space-y-4 mt-4">
          {/* Preferred Areas — full list */}
          {preferredAreas.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-zinc-500">Preferred Areas</p>
                  {hasMoreAreas && (
                    <button className="text-[11px] text-blue-500 hover:underline" onClick={() => setShowAllAreas(!showAllAreas)}>
                      {showAllAreas ? "Show less" : `Show all ${preferredAreas.length}`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visibleAreas.map((a: string) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                  {!showAllAreas && hasMoreAreas && (
                    <Badge variant="outline" className="text-xs text-zinc-400">+{preferredAreas.length - MAX_AREAS_SHOWN} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Score Breakdown — visual bars */}
          {lead.scoreBreakdown && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Score Breakdown</CardTitle>
                <p className="text-[11px] text-zinc-400">How the AI evaluated this lead across different signals</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(lead.scoreBreakdown as Record<string, number>).map(([key, val]) => {
                  const info = scoreLabels[key] ?? { label: key.charAt(0).toUpperCase() + key.slice(1), description: "" };
                  return (
                    <ScoreBar
                      key={key}
                      label={info.label}
                      value={val}
                      maxValue={10}
                      description={info.description}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Original Post — cleaned */}
          {cleanedText && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Original Post</CardTitle>
                <p className="text-[11px] text-zinc-400">Source content from {platformLabels[lead.platform] ?? lead.platform}</p>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-3">
                  <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {displayText}{isTextLong && !showFullText && "..."}
                  </p>
                  {isTextLong && (
                    <button
                      className="text-xs text-blue-500 hover:underline mt-2"
                      onClick={() => setShowFullText(!showFullText)}
                    >
                      {showFullText ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Matches Tab ─── */}
        <TabsContent value="matches" className="space-y-3 mt-4">
          {lead.matches?.length === 0 && (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">No property matches yet</p>
              <p className="text-xs text-zinc-400 mt-1">Click "Match" above to find matching properties</p>
            </div>
          )}
          {lead.matches?.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="flex items-start justify-between p-4 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{m.property?.name}</p>
                  <p className="text-sm text-zinc-500">{m.property?.area} · {m.property?.propertyType}</p>
                  {m.aiSummary && <p className="mt-2 text-sm text-zinc-600">{m.aiSummary}</p>}
                  {(m.matchReasons as string[])?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(m.matchReasons as string[]).map((r: string) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-green-600">{m.matchScore}%</p>
                  <Badge variant="outline" className="text-xs">{m.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ─── Outreach Tab ─── */}
        <TabsContent value="outreach" className="space-y-3 mt-4">
          {lead.outreachEvents?.length === 0 && (
            <div className="text-center py-8">
              <Mail className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">No outreach events yet</p>
              <p className="text-xs text-zinc-400 mt-1">Use WhatsApp, Email, or AI Coach to start outreach</p>
            </div>
          )}
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

        {/* ─── Enriched/Contact Tab ─── */}
        <TabsContent value="enriched" className="mt-4 space-y-4">
          {lead.enrichedAt ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lead.email && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Email</p>
                        <p className="font-medium text-sm truncate">{lead.email}</p>
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
                      <Phone className="h-5 w-5 text-green-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Phone</p>
                        <p className="font-medium text-sm">{lead.phone}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {lead.company && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-purple-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Company</p>
                        <p className="font-medium text-sm">{lead.company}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {lead.jobTitle && (
                  <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                      <Briefcase className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Job Title</p>
                        <p className="font-medium text-sm">{lead.jobTitle}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              {!lead.email && !lead.phone && !lead.company && !lead.jobTitle && (
                <p className="text-sm text-zinc-400 text-center py-4">Enrichment ran but no contact info was found</p>
              )}
              <p className="text-xs text-zinc-400">
                Enriched {new Date(lead.enrichedAt).toLocaleDateString()} via {lead.enrichmentSource ?? "auto"}
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <Sparkles className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-sm text-zinc-500">Not enriched yet</p>
              <p className="text-xs text-zinc-400 mt-1">Click "Enrich" to find email, phone, and company info</p>
            </div>
          )}
        </TabsContent>

        {/* ─── Notes Tab ─── */}
        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium">Notes</p>
              </div>
              <Textarea
                placeholder="Add notes about this lead... (e.g., spoke to wife, wants Vastu-compliant, referred by Ramesh)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] text-sm"
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
