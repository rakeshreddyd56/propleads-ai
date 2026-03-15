"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

const PROPERTY_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "SOLD_OUT", label: "Sold Out" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "ARCHIVED", label: "Archived" },
];

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "PLOT", label: "Plot" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "INDEPENDENT_HOUSE", label: "Independent House" },
];

export function PropertyActions({ propertyId, property }: { propertyId: string; property?: any }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: property?.name ?? "",
    builderName: property?.builderName ?? "",
    location: property?.location ?? "",
    area: property?.area ?? "",
    reraNumber: property?.reraNumber ?? "",
    description: property?.description ?? "",
    possessionDate: property?.possessionDate ? new Date(property.possessionDate).toISOString().split("T")[0] : "",
    priceMinLakhs: property?.priceMin ? (Number(property.priceMin) / 100000).toString() : "",
    priceMaxLakhs: property?.priceMax ? (Number(property.priceMax) / 100000).toString() : "",
    status: property?.status ?? "ACTIVE",
    propertyType: property?.propertyType ?? "APARTMENT",
  });

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this property? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Property deleted");
        router.push("/properties");
      } else {
        toast.error("Failed to delete property");
      }
    } catch {
      toast.error("Failed to delete property");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data: Record<string, any> = {
        name: form.name,
        builderName: form.builderName,
        location: form.location,
        area: form.area,
        reraNumber: form.reraNumber,
        description: form.description,
        status: form.status,
        propertyType: form.propertyType,
      };
      if (form.possessionDate) data.possessionDate = new Date(form.possessionDate).toISOString();
      else data.possessionDate = null;

      // Convert lakhs to whole INR (multiply by 100000)
      const minLakhs = parseFloat(form.priceMinLakhs);
      const maxLakhs = parseFloat(form.priceMaxLakhs);
      data.priceMin = !isNaN(minLakhs) && minLakhs > 0 ? Math.round(minLakhs * 100000) : null;
      data.priceMax = !isNaN(maxLakhs) && maxLakhs > 0 ? Math.round(maxLakhs * 100000) : null;

      const res = await fetch(`/api/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Property updated");
        setEditOpen(false);
        router.refresh();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
      </Button>
      <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-red-500 hover:text-red-700 hover:bg-red-50">
        {deleting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
        Delete
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Project Name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Builder Name</Label>
                <Input value={form.builderName} onChange={(e) => setForm((f) => ({ ...f, builderName: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm font-medium">RERA Number</Label>
                <Input value={form.reraNumber} onChange={(e) => setForm((f) => ({ ...f, reraNumber: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Location</Label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm font-medium">Area / Micro-market</Label>
                <Input value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Price Min (Lakhs)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 50"
                  value={form.priceMinLakhs}
                  onChange={(e) => setForm((f) => ({ ...f, priceMinLakhs: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Price Max (Lakhs)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 120"
                  value={form.priceMaxLakhs}
                  onChange={(e) => setForm((f) => ({ ...f, priceMaxLakhs: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v ?? f.status }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Property Type</Label>
                <Select value={form.propertyType} onValueChange={(v) => setForm((f) => ({ ...f, propertyType: v ?? f.propertyType }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Possession Date</Label>
              <Input type="date" value={form.possessionDate} onChange={(e) => setForm((f) => ({ ...f, possessionDate: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
