"use client";

import { useEffect, useState, useMemo } from "react";
import { PropertyCard } from "@/components/properties/property-card";
import { UploadDialog } from "@/components/properties/upload-dialog";
import { AddPropertyDialog } from "@/components/properties/add-property-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "ARCHIVED", label: "Archived" },
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function fetchProperties() {
    try {
      const res = await fetch("/api/properties");
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProperties();
  }, []);

  const filtered = useMemo(() => {
    let result = properties;

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Filter by search term (name, area, builderName)
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          (p.name ?? "").toLowerCase().includes(q) ||
          (p.area ?? "").toLowerCase().includes(q) ||
          (p.builderName ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [properties, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-sm text-zinc-500">{properties.length} propert{properties.length === 1 ? "y" : "ies"} in your portfolio</p>
        </div>
        <div className="flex items-center gap-2">
          <AddPropertyDialog onAdded={fetchProperties} />
          <div data-tour="upload-property"><UploadDialog onUploaded={fetchProperties} /></div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      {properties.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Search by name, area, or builder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
          <Building2 className="mb-4 h-8 w-8 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-500">No properties yet</p>
          <p className="text-sm text-zinc-400">Upload a brochure or add a property manually to get started</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20">
          <Search className="mb-4 h-8 w-8 text-zinc-300" />
          <p className="text-lg font-medium text-zinc-500">No properties match your filters</p>
          <p className="text-sm text-zinc-400">Try adjusting your search or status filter</p>
        </div>
      ) : (
        <div data-tour="property-grid" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} matchCount={p._count?.matches ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
