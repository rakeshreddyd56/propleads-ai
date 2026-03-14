"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function OutreachPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", channel: "WHATSAPP", category: "FIRST_CONTACT", subject: "", body: "", variables: "" });

  useEffect(() => {
    fetch("/api/outreach/templates").then(r => r.json()).then(setTemplates).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function createTemplate() {
    try {
      const res = await fetch("/api/outreach/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          variables: form.variables.split(",").map(v => v.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const t = await res.json();
        setTemplates(prev => [t, ...prev]);
        setAddOpen(false);
        toast.success("Template created!");
      }
    } catch { toast.error("Failed to create template"); }
  }

  return (
    <div className="space-y-6">
      <div data-tour="outreach-header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Outreach</h1>
          <p className="text-sm text-zinc-500">Manage templates, campaigns, and track outreach</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger data-tour="new-template" render={<Button />}>
            <Plus className="mr-2 h-4 w-4" /> New Template
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Message Template</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="First Contact — IT Professional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Channel</Label>
                  <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v ?? f.channel }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v ?? f.category }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["FIRST_CONTACT", "BROCHURE_SHARE", "SITE_VISIT", "FOLLOW_UP", "PRICE_UPDATE", "NRI_SPECIFIC"].map(c => (
                        <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()).replace(/\bNri\b/, "NRI")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.channel === "EMAIL" && (
                <div>
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                </div>
              )}
              <div>
                <Label>Message Body</Label>
                <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={5} placeholder="Hi {{name}}, I noticed you were looking for a property in {{area}}..." />
              </div>
              <div>
                <Label>Variables (comma-separated)</Label>
                <Input value={form.variables} onChange={e => setForm(f => ({ ...f, variables: e.target.value }))} placeholder="name, area, property, price" />
              </div>
              <Button onClick={createTemplate} className="w-full">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
          ) : templates.length === 0 ? (
            <p className="py-10 text-center text-zinc-400">No templates yet. Create your first one.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{t.name}</CardTitle>
                      <div className="flex gap-1">
                        <Badge variant="outline">{t.channel}</Badge>
                        <Badge variant="secondary">{t.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()).replace(/\bNri\b/, "NRI")}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-600 line-clamp-3">{t.body}</p>
                    {t.variables?.length > 0 && (
                      <div className="mt-2 flex gap-1">
                        {t.variables.map((v: string) => <Badge key={v} variant="outline" className="text-xs">{"{{" + v + "}}"}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <p className="py-10 text-center text-zinc-400">Campaign builder coming soon. Use templates for direct outreach.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
