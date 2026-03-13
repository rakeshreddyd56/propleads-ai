"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Flame, Sun, Snowflake, Search, Loader2,
  ChevronLeft, ChevronRight, Zap, RefreshCw, LayoutGrid, List,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const platformIcons: Record<string, string> = {
  REDDIT: "🔴", FACEBOOK: "📘", TWITTER: "🐦", QUORA: "❓",
  GOOGLE_MAPS: "📍", NINETY_NINE_ACRES: "🏠", MAGICBRICKS: "🧱",
  NOBROKER: "🔑", COMMONFLOOR: "🏢", INSTAGRAM: "📸",
  LINKEDIN: "💼", YOUTUBE: "▶️", TELEGRAM: "✈️",
};

const platformLabels: Record<string, string> = {
  REDDIT: "Reddit", FACEBOOK: "Facebook", TWITTER: "X/Twitter", QUORA: "Quora",
  GOOGLE_MAPS: "Google Maps", NINETY_NINE_ACRES: "99acres", MAGICBRICKS: "MagicBricks",
  NOBROKER: "NoBroker", COMMONFLOOR: "CommonFloor", INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn", YOUTUBE: "YouTube", TELEGRAM: "Telegram",
};

function ScoreBadge({ score, tier }: { score: number; tier: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white",
        tier === "HOT" && "bg-red-500", tier === "WARM" && "bg-orange-500",
        tier === "COLD" && "bg-blue-400", !tier && "bg-zinc-300"
      )}>
        {score || "—"}
      </div>
      {tier && (
        <span className={cn("text-[10px] font-semibold uppercase",
          tier === "HOT" && "text-red-600", tier === "WARM" && "text-orange-600",
          tier === "COLD" && "text-blue-500"
        )}>{tier}</span>
      )}
    </div>
  );
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
  return budget ?? "—";
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"combined" | "by-source">("combined");
  const limit = 50;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (tierFilter !== "all") params.set("tier", tierFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
      }
    } catch { toast.error("Failed to load leads"); }
    finally { setLoading(false); }
  }, [page, tierFilter, platformFilter, statusFilter, search]);

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
      toast.success(`Scored ${data.scored}, matched ${data.matched}${data.remaining > 0 ? ` (${data.remaining} remaining — click again)` : ""}`);
      fetchLeads();
    } catch { toast.error("Scoring failed"); }
    finally { setScoring(false); }
  }

  const totalPages = Math.ceil(total / limit);

  // Group leads by platform for "by-source" view
  const leadsByPlatform: Record<string, any[]> = {};
  leads.forEach((l) => {
    if (!leadsByPlatform[l.platform]) leadsByPlatform[l.platform] = [];
    leadsByPlatform[l.platform].push(l);
  });
  const platformsWithLeads = Object.keys(leadsByPlatform).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-zinc-500">{total} total leads from all sources</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </Button>
          <Button variant="default" size="sm" onClick={scoreAll} disabled={scoring}>
            {scoring ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Zap className="mr-1.5 h-3.5 w-3.5" />}
            {scoring ? "Scoring..." : "Score & Match All"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        {([
          { key: "HOT", icon: Flame, colors: "red", count: tierCounts.HOT },
          { key: "WARM", icon: Sun, colors: "orange", count: tierCounts.WARM },
          { key: "COLD", icon: Snowflake, colors: "blue", count: tierCounts.COLD },
        ] as const).map(({ key, icon: Icon, colors, count }) => (
          <button key={key} onClick={() => setTierFilter(tierFilter === key ? "all" : key)}
            className={cn("flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer",
              tierFilter === key
                ? `ring-2 ring-${colors}-400 bg-${colors}-50 dark:bg-${colors}-950`
                : `bg-${colors}-50/50 dark:bg-${colors}-950/50 hover:bg-${colors}-50 dark:hover:bg-${colors}-950`
            )}>
            <Icon className={`h-6 w-6 text-${colors}-500`} />
            <div className="text-left">
              <p className={`text-xl font-bold text-${colors}-700`}>{count}</p>
              <p className={`text-[10px] text-${colors}-600 uppercase font-medium`}>{key}</p>
            </div>
          </button>
        ))}
        <div className="flex items-center gap-3 rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-900">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-500 dark:bg-zinc-700">?</div>
          <div>
            <p className="text-xl font-bold text-zinc-600">{tierCounts.UNSCORED}</p>
            <p className="text-[10px] text-zinc-500 uppercase font-medium">Unscored</p>
          </div>
        </div>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
          <Input placeholder="Search by name, text, area..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9" />
        </div>
        <Select value={platformFilter} onValueChange={(v) => { setPlatformFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {Object.keys(platformLabels).map((p) => (
              <SelectItem key={p} value={p}>{platformIcons[p]} {platformLabels[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="CONTACTED">Contacted</SelectItem>
            <SelectItem value="QUALIFIED">Qualified</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
          </SelectContent>
        </Select>
        {(tierFilter !== "all" || platformFilter !== "all" || statusFilter !== "all" || search) && (
          <Button variant="ghost" size="sm"
            onClick={() => { setTierFilter("all"); setPlatformFilter("all"); setStatusFilter("all"); setSearch(""); setPage(1); }}>
            Clear
          </Button>
        )}
        <div className="ml-auto flex rounded-lg border overflow-hidden">
          <button onClick={() => setViewMode("combined")}
            className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
              viewMode === "combined" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}>
            <List className="h-3.5 w-3.5" /> Combined
          </button>
          <button onClick={() => setViewMode("by-source")}
            className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
              viewMode === "by-source" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}>
            <LayoutGrid className="h-3.5 w-3.5" /> By Source
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center py-16 border-2 border-dashed rounded-xl">
          <Search className="mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-500">No leads found</p>
          <p className="text-sm text-zinc-400 mt-1">
            {search || tierFilter !== "all" || platformFilter !== "all"
              ? "Try adjusting your filters"
              : "Run scraping from the Sources page to discover leads"}
          </p>
        </div>
      ) : viewMode === "by-source" ? (
        /* ---- BY-SOURCE VIEW ---- */
        <div className="space-y-8">
          {platformsWithLeads.map((platform) => (
            <section key={platform}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{platformIcons[platform] ?? "🌐"}</span>
                <h2 className="text-lg font-semibold">{platformLabels[platform] ?? platform}</h2>
                <Badge variant="secondary" className="text-xs">{leadsByPlatform[platform].length} leads</Badge>
              </div>
              <LeadTable leads={leadsByPlatform[platform]} compact />
            </section>
          ))}
        </div>
      ) : (
        /* ---- COMBINED VIEW ---- */
        <LeadTable leads={leads} />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <span className="text-sm text-zinc-600">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadTable({ leads, compact }: { leads: any[]; compact?: boolean }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50/50 dark:bg-zinc-900/50">
            <TableHead className="w-[80px]">Score</TableHead>
            <TableHead>Lead</TableHead>
            {!compact && <TableHead>Platform</TableHead>}
            <TableHead>Budget</TableHead>
            <TableHead>Areas</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Persona</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead>Match</TableHead>
            <TableHead className="w-[70px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <TableCell>
                <Link href={`/leads/${lead.id}`}>
                  <ScoreBadge score={lead.score} tier={lead.tier} />
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/leads/${lead.id}`} className="block">
                  <p className="font-medium text-sm hover:underline">{lead.name ?? "Unknown"}</p>
                  <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                    {lead.originalText?.slice(0, 60)}{lead.originalText?.length > 60 ? "..." : ""}
                  </p>
                </Link>
              </TableCell>
              {!compact && (
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{platformIcons[lead.platform] ?? "🌐"}</span>
                    <span className="text-xs text-zinc-600">{platformLabels[lead.platform] ?? lead.platform}</span>
                  </div>
                </TableCell>
              )}
              <TableCell>
                <span className="text-sm font-medium">
                  {formatBudget(lead.budget, lead.budgetMin, lead.budgetMax)}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1 max-w-[150px]">
                  {lead.preferredArea?.slice(0, 2).map((a: string) => (
                    <Badge key={a} variant="secondary" className="text-[10px] px-1.5 py-0">{a}</Badge>
                  ))}
                  {(lead.preferredArea?.length ?? 0) > 2 && (
                    <span className="text-[10px] text-zinc-400">+{lead.preferredArea.length - 2}</span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs text-zinc-600">{lead.propertyType ?? "—"}</TableCell>
              <TableCell>
                {lead.buyerPersona ? (
                  <Badge variant="outline" className="text-[10px]">{lead.buyerPersona}</Badge>
                ) : <span className="text-xs text-zinc-400">—</span>}
              </TableCell>
              <TableCell className="text-xs text-zinc-600">{lead.timeline ?? "—"}</TableCell>
              <TableCell>
                {lead.matches?.[0] ? (
                  <div className="text-right">
                    <p className="text-[11px] font-semibold text-green-600">{lead.matches[0].matchScore}%</p>
                    <p className="text-[10px] text-zinc-500 truncate max-w-[100px]">{lead.matches[0].property?.name}</p>
                  </div>
                ) : <span className="text-[10px] text-zinc-400">—</span>}
              </TableCell>
              <TableCell>
                <Badge
                  variant={lead.status === "NEW" || lead.status === "QUALIFIED" ? "default" : "outline"}
                  className={cn("text-[10px]",
                    lead.status === "CONVERTED" && "bg-green-100 text-green-700",
                    lead.status === "LOST" && "bg-red-100 text-red-700"
                  )}>
                  {lead.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
