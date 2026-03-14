"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChatInterface } from "@/components/coach/chat-interface";
import { MessageGenerator } from "@/components/coach/message-generator";
import { Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";

function PlaybookGenerator() {
  const [leadProfile, setLeadProfile] = useState("");
  const [matchedProperty, setMatchedProperty] = useState("");
  const [playbook, setPlaybook] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!leadProfile.trim() || !matchedProperty.trim()) {
      toast.error("Please fill in both the lead profile and matched property");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/coach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "playbook",
          leadProfile,
          matchedProperty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Playbook generation failed");
        return;
      }
      setPlaybook(data.playbook);
    } catch {
      toast.error("Playbook generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate Sales Playbook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Lead Profile</Label>
            <Textarea
              placeholder="Describe the lead: budget, preferred areas, buyer persona, timeline, occupation, family size, etc."
              value={leadProfile}
              onChange={(e) => setLeadProfile(e.target.value)}
              rows={5}
            />
          </div>
          <div>
            <Label>Matched Property Description</Label>
            <Textarea
              placeholder="Describe the property: name, location, unit types, price range, amenities, USPs, possession date, etc."
              value={matchedProperty}
              onChange={(e) => setMatchedProperty(e.target.value)}
              rows={5}
            />
          </div>
          <Button onClick={handleGenerate} disabled={loading || !leadProfile.trim() || !matchedProperty.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
            Generate Playbook
          </Button>
        </CardContent>
      </Card>

      {playbook && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated Playbook</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 dark:bg-zinc-900">
              {playbook}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CoachContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") ?? undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Conversation Coach</h1>
        <p className="text-sm text-zinc-500">Get AI-powered sales coaching tailored to Hyderabad real estate</p>
      </div>

      <Tabs defaultValue="analyze">
        <TabsList>
          <TabsTrigger value="analyze" data-tour="coach-analyze">Analyze Conversation</TabsTrigger>
          <TabsTrigger value="generate" data-tour="coach-generate">Quick Message</TabsTrigger>
          <TabsTrigger value="playbook" data-tour="coach-playbook">Generate Playbook</TabsTrigger>
        </TabsList>
        <TabsContent value="analyze">
          <ChatInterface leadId={leadId} />
        </TabsContent>
        <TabsContent value="generate">
          <MessageGenerator />
        </TabsContent>
        <TabsContent value="playbook">
          <PlaybookGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>}>
      <CoachContent />
    </Suspense>
  );
}
