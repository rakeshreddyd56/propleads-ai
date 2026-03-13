"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Flame, Sun, Snowflake, Search, Loader2,
  ChevronLeft, ChevronRight, Zap, RefreshCw, ExternalLink, User,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const platformMeta: Record<string, { label: string; icon: string; color: string }> = {
  REDDIT: { label: "Reddit", icon: "🔴", color: "bg-orange-100 text-orange-700" },
  FACEBOOK: { label: "Facebook", icon: "📘", color: "bg-blue-100 text-blue-700" },
  TWITTER: { label: "X / Twitter", icon: "🐦", color: "bg-sky-100 text-sky-700" },
  QUORA: { label: "Quora", icon: "❓", color: "bg-red-100 text-red-700" },
  GOOGLE_MAPS: { label: "Google Maps", icon: "📍", color: "bg-green-100 text-green-700" },
  NINETY_NINE_ACRES: { label: "99acres", icon: "🏠", color: "bg-emerald-100 text-emerald-700" },
  MAGICBRICKS: { label: "MagicBricks", icon: "🧱", color: "bg-amber-100 text-amber-700" },
  NOBROKER: { label: "NoBroker", icon: "🔑", color: "bg-yellow-100 text-yellow-700" },
  COMMONFLOOR: { label: "CommonFloor", icon: "🏢", color: "bg-indigo-100 text-indigo-700" },
  INSTAGRAM: { label: "Instagram", icon: "📸", color: "bg-pink-100 text-pink-700" },
  LINKEDIN: { label: "LinkedIn", icon: "💼", color: "bg-blue-100 text-blue-800" },
  YOUTUBE: { label: "YouTube", icon: "▶️", color: "bg-red-100 text-red-700" },
  TELEGRAM: { label: "Telegram", icon: "✈️", color: "bg-cyan-100 text-cyan-700" },
};

function getSourceLabel(url: string | null, platform: string): string {
  if (!url) return "";
  try {
    if (platform === "REDDIT") {
      const match = url.match(/\/r\/([^/]+)/);
      return match ? `r/${match[1]}` : "";
    }
    if (platform === "FACEBOOK") {
      const match = url.match(/groups\/([^/]+)/);
      return match ? `Group: ${match[1]}` : "";
    }
    if (platform === "TELEGRAM") {
      const match = url.match(/t\.me\/([^/]+)/);
      return match ? `@${match[1]}` : "";
    }
    if (platform === "INSTAGRAM") {
      const match = url.match(/instagram\.com\/([^/]+)/);
      return match ? `@${match[1]}` : "";
    }
    if (platform === "YOUTUBE") {
      return "YouTube";
    }
    // For portals, just show domain
    const domain = new URL(url).hostname.replace("www.", "");
    return domain;
  } catch {
    return "";
  }
}

function formatBudget(budget: string | null, min: number | null, max: number | null) {
  if (min || max) {
    const fmt = (n: number) => {
      if (n >= 10000000) return `${(n / 10000000).toFixed(1)} Cr`;
      if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
      return n.toLocaleString("en-IN");
    };
    if (min && max) return `${fmt(min)} - ${fmt(max)}`;
    if (min) return `${fmt(min)}+`;
    if (max) return `Up to ${fmt(max)}`;
  }
  return budget || null;
}

function tierConfig(tier: string) {
  switch (tier) {
    case "HOT": return { bg: "bg-red-500", text: "text-red-600", label: "Hot" };
    case "WARM": return { bg: "bg-orange-500", text: "text-orange-600", label: "Warm" };
    case "COLD": return { bg: "bg-blue-400", text: "text-blue-500", label: "Cold" };
    default: return { bg: "bg-zinc-300", text: "text-zinc-500", label: "" };
  }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const limit = 50;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (tierFilter !== "all") params.set("tier", tierFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  }, [page, tierFilter, platformFilter, search]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const tierCounts = { HOT: 0, WARM: 0, COLD: 0, UNSCORED: 0 };
  leads.forEach((l) => {
    if (l.score === 0 && !l.tier) tierCounts.UNSCORED++;
    else if (l.tier === "HOT") tierCounts.HOT++;
    else if (l.tier === "WARM") tierCounts.WARM++;
    else if (l.tier === "COLD") tierCounts.COLD++;
  });

  async function scoreAll() {
    setScoring(true);
    try {
      const res = await fetch("/api/leads/score-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Scoring failed"); return; }
      toast.success(`Scored ${data.scored}, matched ${data.matched}${data.remaining > 0 ? ` (${data.remaining} remaining)` : ""}`);
      fetchLeads();
    } catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  }

  const totalPages = Math.ceil(total / limit);

  // Group leads by platform
  const leadsByPlatform: Record<string, any[]> = {};
  leads.forEach((l) => {
    if (!leadsByPlatform[l.platform]) leadsByPlatform[l.platform] = [];
    leadsByPlatform[l.platform].push(l);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-zinc-500">{total} leads found across all sources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button size="sm" onClick={scoreAll} disabled={scoring}>
            {scoring ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
            Score & Match All
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex gap-3">
        {(["HOT", "WARM", "COLD"] as const).map((t) => {
          const { bg, text } = tierConfig(t);
          const icons = { HOT: Flame, WARM: Sun, COLD: Snowflake };
          const Icon = icons[t];
          return (
            <button key={t}
              onClick={() => setTierFilter(tierFilter === t ? "all" : t)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2 transition-all",
                tierFilter === t ? "ring-2 ring-zinc-400 bg-zinc-50" : "hover:bg-zinc-50"
              )}>
              <Icon className={cn("h-4 w-4", text)} />
              <span className="text-lg font-bold">{tierCounts[t]}</span>
              <span className={cn("text-xs font-medium uppercase", text)}>{t}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input placeholder="Search leads..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9" />
        </div>
        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {Object.entries(platformMeta).map(([key, { label, icon }]) => (
              <SelectItem key={key} value={key}>{icon} {label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(tierFilter !== "all" || platformFilter !== "all" || search) && (
          <Button variant="ghost" size="sm"
            onClick={() => { setTierFilter("all"); setPlatformFilter("all"); setSearch(""); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Lead Cards */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center py-16 border-2 border-dashed rounded-xl">
          <Search className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-500">No leads found</p>
          <p className="text-sm text-zinc-400 mt-1">Run scraping from the Sources page to discover leads</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const pm = platformMeta[lead.platform] ?? { label: lead.platform, icon: "🌐", color: "bg-zinc-100 text-zinc-700" };
            const tc = tierConfig(lead.tier);
            const budget = formatBudget(lead.budget, lead.budgetMin, lead.budgetMax);
            const sourceLabel = getSourceLabel(lead.sourceUrl, lead.platform);
            const areas = lead.preferredArea?.filter(Boolean) ?? [];

            return (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block">
                <div className="flex items-start gap-4 rounded-xl border p-4 transition-all hover:border-zinc-300 hover:shadow-sm bg-white dark:bg-zinc-950">
                  {/* Score Circle */}
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white", tc.bg)}>
                      {lead.score || "?"}
                    </div>
                    {tc.label && <span className={cn("text-[10px] font-semibold uppercase", tc.text)}>{tc.label}</span>}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Source + User Name */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", pm.color)}>
                        {pm.icon} {pm.label}
                      </span>
                      {(lead.source || sourceLabel) && (
                        <span className="text-xs text-zinc-400">{lead.source || sourceLabel}</span>
                      )}
                      {lead.lastSeenAt && (
                        <span className="text-[10px] text-zinc-300 ml-auto">
                          Last seen {new Date(lead.lastSeenAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Row 2: User */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-semibold text-sm">{lead.name ?? "Unknown"}</span>
                      {lead.profileUrl && (
                        <a href={lead.profileUrl} target="_blank" rel="noopener noreferrer"
                          className="text-zinc-400 hover:text-zinc-600" onClick={(e) => e.stopPropagation()}>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <Badge variant="outline" className="ml-auto text-[10px]">{lead.status}</Badge>
                    </div>

                    {/* Row 3: What they said */}
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                      {lead.originalText?.slice(0, 200)}
                    </p>

                    {/* Row 4: Key details as pills */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {budget && (
                        <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                          {budget}
                        </span>
                      )}
                      {lead.propertyType && (
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/20">
                          {lead.propertyType}
                        </span>
                      )}
                      {areas.slice(0, 3).map((a: string) => (
                        <span key={a} className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                          {a}
                        </span>
                      ))}
                      {areas.length > 3 && (
                        <span className="text-[10px] text-zinc-400">+{areas.length - 3} more</span>
                      )}
                      {lead.timeline && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          {lead.timeline}
                        </span>
                      )}
                      {lead.buyerPersona && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          {lead.buyerPersona.replace(/_/g, " ")}
                        </span>
                      )}
                      {lead.matches?.[0] && (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          {lead.matches[0].matchScore}% match → {lead.matches[0].property?.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm text-zinc-600">Page {page}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
