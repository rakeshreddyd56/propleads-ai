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
import { Plus, Loader2, Pencil, Trash2, Mail, MessageSquare, Phone, Send, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = ["WHATSAPP", "EMAIL", "SMS", "INSTAGRAM_DM", "PHONE_CALL"] as const;
const CATEGORIES = ["FIRST_CONTACT", "BROCHURE_SHARE", "SITE_VISIT", "FOLLOW_UP", "PRICE_UPDATE", "MARKET_UPDATE", "NRI_SPECIFIC", "TESTIMONIAL"] as const;

const emptyForm = { name: "", channel: "WHATSAPP", category: "FIRST_CONTACT", subject: "", body: "", variables: "" };

function formatCategory(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()).replace(/\bNri\b/, "NRI");
}

function channelIcon(channel: string) {
  switch (channel) {
    case "EMAIL": return <Mail className="h-4 w-4" />;
    case "WHATSAPP": return <MessageSquare className="h-4 w-4" />;
    case "SMS": return <Send className="h-4 w-4" />;
    case "PHONE_CALL": return <Phone className="h-4 w-4" />;
    case "INSTAGRAM_DM": return <MessageSquare className="h-4 w-4" />;
    default: return <Send className="h-4 w-4" />;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "SENT": return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Sent</Badge>;
    case "DELIVERED": return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" />Delivered</Badge>;
    case "READ": return <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" />Read</Badge>;
    case "REPLIED": return <Badge className="gap-1"><CheckCircle className="h-3 w-3" />Replied</Badge>;
    case "FAILED": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
    case "PENDING": return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    case "OPTED_OUT": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Opted Out</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function OutreachPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", ...emptyForm });

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/outreach/templates").then(r => r.json()).then(setTemplates).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function refreshTemplates() {
    fetch("/api/outreach/templates").then(r => r.json()).then(setTemplates).catch(() => {});
  }

  function loadHistory() {
    if (historyLoaded) return;
    setHistoryLoading(true);
    fetch("/api/outreach/history")
      .then(r => r.json())
      .then(data => { setHistory(data); setHistoryLoaded(true); })
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setHistoryLoading(false));
  }

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
        setForm(emptyForm);
        toast.success("Template created!");
      }
    } catch { toast.error("Failed to create template"); }
  }

  function openEdit(t: any) {
    setEditForm({
      id: t.id,
      name: t.name,
      channel: t.channel,
      category: t.category,
      subject: t.subject ?? "",
      body: t.body,
      variables: (t.variables ?? []).join(", "),
    });
    setEditOpen(true);
  }

  async function updateTemplate() {
    try {
      const res = await fetch("/api/outreach/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editForm.id,
          name: editForm.name,
          channel: editForm.channel,
          category: editForm.category,
          subject: editForm.subject || undefined,
          body: editForm.body,
          variables: editForm.variables.split(",").map(v => v.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setEditOpen(false);
        refreshTemplates();
        toast.success("Template updated!");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Update failed");
      }
    } catch { toast.error("Failed to update template"); }
  }

  function confirmDelete(id: string) {
    setDeleteId(id);
    setDeleteOpen(true);
  }

  async function deleteTemplate() {
    if (!deleteId) return;
    try {
      const res = await fetch("/api/outreach/templates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteId }),
      });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== deleteId));
        setDeleteOpen(false);
        setDeleteId(null);
        toast.success("Template deleted!");
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Delete failed");
      }
    } catch { toast.error("Failed to delete template"); }
  }

  // Shared template form fields
  function renderTemplateFormFields(
    f: typeof form,
    setF: (updater: (prev: typeof form) => typeof form) => void,
  ) {
    return (
      <div className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input value={f.name} onChange={e => setF(prev => ({ ...prev, name: e.target.value }))} placeholder="First Contact — IT Professional" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Channel</Label>
            <Select value={f.channel} onValueChange={v => setF(prev => ({ ...prev, channel: v ?? prev.channel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map(c => (
                  <SelectItem key={c} value={c}>{c === "INSTAGRAM_DM" ? "Instagram DM" : c === "PHONE_CALL" ? "Phone Call" : c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={f.category} onValueChange={v => setF(prev => ({ ...prev, category: v ?? prev.category }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{formatCategory(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {f.channel === "EMAIL" && (
          <div>
            <Label>Subject</Label>
            <Input value={f.subject} onChange={e => setF(prev => ({ ...prev, subject: e.target.value }))} />
          </div>
        )}
        <div>
          <Label>Message Body</Label>
          <Textarea value={f.body} onChange={e => setF(prev => ({ ...prev, body: e.target.value }))} rows={5} placeholder="Hi {{name}}, I noticed you were looking for a property in {{area}}..." />
        </div>
        <div>
          <Label>Variables (comma-separated)</Label>
          <Input value={f.variables} onChange={e => setF(prev => ({ ...prev, variables: e.target.value }))} placeholder="name, area, property, price" />
        </div>
      </div>
    );
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
            {renderTemplateFormFields(form, setForm)}
            <Button onClick={createTemplate} className="w-full">Create Template</Button>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="history" onClick={loadHistory}>History</TabsTrigger>
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
                      <div className="flex items-center gap-1">
                        <Badge variant="outline">{t.channel}</Badge>
                        <Badge variant="secondary">{formatCategory(t.category)}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-600 line-clamp-3">{t.body}</p>
                    {t.variables?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.variables.map((v: string) => <Badge key={v} variant="outline" className="text-xs">{"{{" + v + "}}"}</Badge>)}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => confirmDelete(t.id)}>
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card className="mx-auto max-w-lg">
            <CardHeader>
              <CardTitle className="text-lg">Campaign Builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-600">
              <p>
                The campaign builder will let you create multi-step outreach sequences,
                schedule messages across channels, and track engagement metrics for groups
                of leads automatically.
              </p>
              <p>
                In the meantime, you can use <strong>Templates</strong> together with the{" "}
                <strong>AI Message Generator</strong> on individual lead pages to craft
                personalized outreach.
              </p>
              <p>
                Need help crafting the right approach? Visit the{" "}
                <a href="/coach" className="text-blue-600 underline hover:text-blue-700">
                  AI Coach
                </a>{" "}
                for conversation playbooks and objection-handling scripts tailored to
                Hyderabad micro-markets.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {historyLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>
          ) : history.length === 0 ? (
            <p className="py-10 text-center text-zinc-400">No outreach events yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((ev: any) => (
                <Card key={ev.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      {channelIcon(ev.channel)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {ev.lead?.name ?? "Unknown Lead"}
                        </span>
                        <Badge variant="outline" className="text-xs">{ev.channel}</Badge>
                        <Badge variant="outline" className="text-xs">{ev.direction}</Badge>
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {ev.content ? ev.content.slice(0, 100) + (ev.content.length > 100 ? "..." : "") : "No content"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {statusBadge(ev.status)}
                      <span className="text-xs text-zinc-400">
                        {new Date(ev.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          {renderTemplateFormFields(editForm, setEditForm as any)}
          <Button onClick={updateTemplate} className="w-full">Save Changes</Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Template?</DialogTitle></DialogHeader>
          <p className="text-sm text-zinc-500">This action cannot be undone. The template will be permanently removed.</p>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteTemplate}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
