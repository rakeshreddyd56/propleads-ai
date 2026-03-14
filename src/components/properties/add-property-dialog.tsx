"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "PLOT", label: "Plot" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "INDEPENDENT_HOUSE", label: "Independent House" },
];

const EMPTY_FORM = {
  name: "",
  builderName: "",
  area: "",
  location: "Hyderabad",
  propertyType: "APARTMENT",
  priceMinLakhs: "",
  priceMaxLakhs: "",
  reraNumber: "",
  possessionDate: "",
  description: "",
};

export function AddPropertyDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!form.area.trim()) {
      toast.error("Area / Micro-market is required");
      return;
    }
    if (!form.location.trim()) {
      toast.error("Location is required");
      return;
    }

    setSaving(true);
    try {
      const minLakhs = parseFloat(form.priceMinLakhs);
      const maxLakhs = parseFloat(form.priceMaxLakhs);

      const payload: Record<string, any> = {
        name: form.name.trim(),
        builderName: form.builderName.trim() || null,
        area: form.area.trim(),
        location: form.location.trim(),
        propertyType: form.propertyType,
        reraNumber: form.reraNumber.trim() || null,
        description: form.description.trim() || null,
        priceMin: !isNaN(minLakhs) && minLakhs > 0 ? Math.round(minLakhs * 100000) : null,
        priceMax: !isNaN(maxLakhs) && maxLakhs > 0 ? Math.round(maxLakhs * 100000) : null,
        possessionDate: form.possessionDate ? new Date(form.possessionDate).toISOString() : null,
        unitTypes: [],
        amenities: [],
        usps: [],
      };

      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Property added!");
        setOpen(false);
        setForm({ ...EMPTY_FORM });
        onAdded?.();
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error ?? "Failed to add property");
      }
    } catch {
      toast.error("Failed to add property");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="mr-2 h-4 w-4" /> Add Property
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Property Manually</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Project Name *</Label>
            <Input
              placeholder="e.g. My Home Tridasa"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Builder Name</Label>
              <Input
                placeholder="e.g. My Home Group"
                value={form.builderName}
                onChange={(e) => setForm((f) => ({ ...f, builderName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">RERA Number</Label>
              <Input
                placeholder="e.g. P02400003488"
                value={form.reraNumber}
                onChange={(e) => setForm((f) => ({ ...f, reraNumber: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Area / Micro-market *</Label>
              <Input
                placeholder="e.g. Kokapet"
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Location *</Label>
              <Input
                placeholder="Hyderabad"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Property Type</Label>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Price Min (Lakhs)</Label>
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
              <Label className="text-xs">Price Max (Lakhs)</Label>
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
          <div>
            <Label className="text-xs">Possession Date</Label>
            <Input
              type="date"
              value={form.possessionDate}
              onChange={(e) => setForm((f) => ({ ...f, possessionDate: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              placeholder="Brief description of the property..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add Property
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
