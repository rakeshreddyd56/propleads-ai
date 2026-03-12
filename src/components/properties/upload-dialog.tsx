"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";

export function UploadDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [blobUrl, setBlobUrl] = useState<string>("");

  async function handleExtract() {
    if (!file) return;
    setExtracting(true);
    try {
      // 1. Upload file directly to Vercel Blob from client (bypasses 4.5MB serverless limit)
      const blob = await upload(`brochures/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });

      // 2. Send blob URL to API for AI extraction (no large payload)
      const res = await fetch("/api/properties/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobUrl: blob.url, fileName: file.name, fileType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExtracted(data.extracted);
      setBlobUrl(blob.url);
      toast.success("Brochure analyzed by AI!");
    } catch (e: any) {
      toast.error(e.message || "Failed to analyze brochure");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!extracted) return;
    setSaving(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...extracted,
          brochureUrl: blobUrl,
          extractedData: extracted,
          priceMin: extracted.unitTypes?.[0]?.priceINR,
          priceMax: extracted.unitTypes?.[extracted.unitTypes.length - 1]?.priceINR,
        }),
      });
      if (res.ok) {
        toast.success("Property added!");
        setOpen(false);
        setExtracted(null);
        setFile(null);
        router.refresh();
      }
    } catch {
      toast.error("Failed to save property");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Upload className="mr-2 h-4 w-4" /> Upload Brochure
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Property Brochure</DialogTitle>
        </DialogHeader>

        {!extracted ? (
          <div className="space-y-4">
            <div>
              <Label>Brochure PDF or Image</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleExtract} disabled={!file || extracting} className="w-full">
              {extracting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> AI is analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Extract with AI
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-green-50 p-3 dark:bg-green-950">
              <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                <Check className="h-4 w-4" /> AI extracted the following details
              </p>
            </div>

            <div className="grid gap-3">
              <div>
                <Label className="text-xs text-zinc-500">Project Name</Label>
                <p className="font-medium">{extracted.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-zinc-500">Builder</Label>
                  <p>{extracted.builderName}</p>
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">RERA Number</Label>
                  <p>{extracted.reraNumber ?? "Not found"}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Location</Label>
                <p>{extracted.location} — {extracted.area}</p>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Unit Types</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {extracted.unitTypes?.map((u: any, i: number) => (
                    <Badge key={i} variant="outline">
                      {u.type} · {u.sizeSqft} sqft · ₹{(u.priceINR / 100000).toFixed(0)}L
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Amenities</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {extracted.amenities?.map((a: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">USPs</Label>
                <ul className="list-disc list-inside text-sm">
                  {extracted.usps?.map((u: string, i: number) => <li key={i}>{u}</li>)}
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setExtracted(null)}>Re-upload</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Property
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
