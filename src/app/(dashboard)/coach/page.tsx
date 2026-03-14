"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInterface } from "@/components/coach/chat-interface";
import { MessageGenerator } from "@/components/coach/message-generator";
import { Loader2 } from "lucide-react";

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
        </TabsList>
        <TabsContent value="analyze">
          <ChatInterface leadId={leadId} />
        </TabsContent>
        <TabsContent value="generate">
          <MessageGenerator />
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
