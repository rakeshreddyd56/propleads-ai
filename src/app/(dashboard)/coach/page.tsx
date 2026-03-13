import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInterface } from "@/components/coach/chat-interface";
import { MessageGenerator } from "@/components/coach/message-generator";

export default function CoachPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Conversation Coach</h1>
        <p className="text-sm text-zinc-500">Get AI-powered sales coaching tailored to Hyderabad real estate</p>
      </div>

      <Tabs defaultValue="analyze">
        <TabsList>
          <TabsTrigger value="analyze">Analyze Conversation</TabsTrigger>
          <TabsTrigger value="generate">Quick Message</TabsTrigger>
        </TabsList>
        <TabsContent value="analyze" data-tour="coach-analyze">
          <ChatInterface />
        </TabsContent>
        <TabsContent value="generate" data-tour="coach-generate">
          <MessageGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
