"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

const personas = [
  "IT Professional", "NRI Investor", "First-time Buyer",
  "Investor", "Luxury Buyer", "Family Upgrader",
];

const stages = [
  "First Contact", "Follow-up", "Brochure Share",
  "Site Visit Invite", "Price Discussion", "Closing",
];

export function MessageGenerator() {
  const [persona, setPersona] = useState("");
  const [property, setProperty] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");
  const [stage, setStage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!persona || !property || !stage) return;
    setLoading(true);
    try {
      const res = await fetch("/api/coach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "message", persona, property, channel, stage }),
      });
      const data = await res.json();
      setMessage(data.message);
    } catch {
      toast.error("Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Message Generator</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Buyer Persona</Label>
            <Select onValueChange={(v) => setPersona(String(v ?? ""))}>
              <SelectTrigger><SelectValue placeholder="Select persona" /></SelectTrigger>
              <SelectContent>
                {personas.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Property Name</Label>
            <Input value={property} onChange={(e) => setProperty(e.target.value)} placeholder="e.g., My Home Vihanga" />
          </div>
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel((v as "whatsapp" | "email" | "sms") ?? channel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Stage</Label>
            <Select onValueChange={(v) => setStage(String(v ?? ""))}>
              <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button onClick={generate} disabled={loading || !persona || !property || !stage} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Generated Message</CardTitle>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(message); toast.success("Copied!"); }}>
              <Copy className="mr-1 h-3 w-3" /> Copy
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900 whitespace-pre-wrap text-sm">
              {message}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
