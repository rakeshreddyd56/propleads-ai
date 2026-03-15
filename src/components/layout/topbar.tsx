"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Search, X, Loader2, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "./sidebar-context";

interface SearchResult {
  type: "lead" | "property";
  id: string;
  name: string;
  subtitle: string;
}

export function Topbar() {
  const router = useRouter();
  const { toggle } = useSidebar();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [recentHotLeads, setRecentHotLeads] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch hot lead count for notifications
  useEffect(() => {
    fetch("/api/leads?tier=HOT&limit=5")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setNotifCount(data.total ?? 0);
          setRecentHotLeads((data.leads ?? []).slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setShowResults(false); return; }
    setSearching(true);
    try {
      const [leadsRes, propsRes] = await Promise.all([
        fetch(`/api/leads?search=${encodeURIComponent(q)}&limit=5`).then(r => r.ok ? r.json() : null),
        fetch(`/api/properties?search=${encodeURIComponent(q)}&limit=5`).then(r => r.ok ? r.json() : null),
      ]);
      const items: SearchResult[] = [];
      if (leadsRes?.leads) {
        leadsRes.leads.slice(0, 5).forEach((l: any) => {
          items.push({ type: "lead", id: l.id, name: l.name ?? "Unknown", subtitle: `${l.platform} · Score ${l.score ?? "?"}` });
        });
      }
      if (propsRes) {
        const props = Array.isArray(propsRes) ? propsRes : propsRes.properties ?? [];
        props.slice(0, 5).forEach((p: any) => {
          items.push({ type: "property", id: p.id, name: p.name ?? "Unknown", subtitle: p.area ?? p.location ?? "" });
        });
      }
      setResults(items);
      setShowResults(items.length > 0);
    } catch {}
    finally { setSearching(false); }
  }, []);

  function handleSearchInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/80 px-4 backdrop-blur dark:bg-zinc-950/80 md:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger menu button - visible only on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggle}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div data-tour="search" className="relative w-48 sm:w-64" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search leads, properties..."
            className="pl-10 pr-8"
            value={query}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); setShowResults(false); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {searching && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-400" />}
          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border bg-white shadow-lg dark:bg-zinc-950 max-h-80 overflow-y-auto z-50">
              {results.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  onClick={() => {
                    router.push(r.type === "lead" ? `/leads/${r.id}` : `/properties/${r.id}`);
                    setShowResults(false);
                    setQuery("");
                  }}
                >
                  <Badge variant="outline" className="text-[10px] shrink-0">{r.type === "lead" ? "Lead" : "Property"}</Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-zinc-400 truncate">{r.subtitle}</p>
                  </div>
                </button>
              ))}
              {results.length === 0 && query.length >= 2 && !searching && (
                <p className="px-3 py-4 text-sm text-zinc-400 text-center">No results found</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <Button data-tour="notifications" variant="ghost" size="icon" className="relative" onClick={() => setShowNotif(!showNotif)}>
            <Bell className="h-5 w-5" />
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border bg-white shadow-lg dark:bg-zinc-950 z-50">
              <div className="px-3 py-2 border-b">
                <p className="text-sm font-semibold">Hot Lead Alerts</p>
              </div>
              {recentHotLeads.length === 0 ? (
                <p className="px-3 py-6 text-sm text-zinc-400 text-center">No hot leads yet</p>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {recentHotLeads.map((l: any) => (
                    <button
                      key={l.id}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      onClick={() => { router.push(`/leads/${l.id}`); setShowNotif(false); }}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shrink-0">
                        {l.score ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{l.name ?? "Unknown"}</p>
                        <p className="text-xs text-zinc-400">{l.platform} · {l.preferredArea?.[0] ?? ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="px-3 py-2 border-t">
                <button onClick={() => { router.push("/leads?tier=HOT"); setShowNotif(false); }} className="text-xs text-blue-500 hover:underline">
                  View all hot leads
                </button>
              </div>
            </div>
          )}
        </div>
        <UserButton />
      </div>
    </header>
  );
}
