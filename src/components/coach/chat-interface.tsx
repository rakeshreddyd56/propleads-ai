"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, User } from "lucide-react";
import { toast } from "sonner";

export function ChatInterface({ leadId }: { leadId?: string }) {
  const [conversation, setConversation] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadName, setLeadName] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;
    fetch(`/api/leads/${leadId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.name) setLeadName(d.name); })
      .catch(() => {});
  }, [leadId]);

  async function handleAnalyze() {
    if (!conversation.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation, leadId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Analysis failed"); return; }
      setAnalysis(data.analysis);
    } catch {
      toast.error("Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {leadId && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm dark:border-blue-800 dark:bg-blue-950">
          <User className="h-4 w-4 text-blue-500" />
          <span className="text-zinc-600 dark:text-zinc-400">Coaching for lead:</span>
          <Badge variant="outline">{leadName ?? leadId}</Badge>
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paste Your Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Paste your WhatsApp/email conversation with the lead here..."
            value={conversation}
            onChange={(e) => setConversation(e.target.value)}
            rows={8}
          />
          <Button onClick={handleAnalyze} disabled={loading || !conversation.trim()}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Analyze & Coach
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Coaching Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {analysis}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
