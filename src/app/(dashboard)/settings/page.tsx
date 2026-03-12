import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Key, Users, Bell } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-zinc-500">Configure your platform, API keys, and compliance settings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">API Keys</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Anthropic API Key", env: "ANTHROPIC_API_KEY" },
              { label: "Firecrawl API Key", env: "FIRECRAWL_API_KEY" },
              { label: "Reddit Client ID", env: "REDDIT_CLIENT_ID" },
              { label: "Apollo.io API Key", env: "APOLLO_API_KEY" },
              { label: "Hunter.io API Key", env: "HUNTER_API_KEY" },
              { label: "AiSensy API Key", env: "AISENSY_API_KEY" },
              { label: "Resend API Key", env: "RESEND_API_KEY" },
            ].map((key) => (
              <div key={key.env}>
                <Label className="text-xs">{key.label}</Label>
                <Input type="password" placeholder={`${key.env}=***`} disabled className="mt-1" />
              </div>
            ))}
            <p className="text-xs text-zinc-400">API keys are configured via environment variables on Vercel.</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">Compliance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">DPDP Act 2023 Compliance</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">TRAI DND Check</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">RERA Verification</span>
                <Badge variant="default">Active</Badge>
              </div>
              <p className="text-xs text-zinc-400">All outreach requires explicit opt-in per DPDP Act. DND status verified before SMS.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-zinc-500">Notification preferences coming soon. Currently all hot leads trigger alerts.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-base">Team</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-500">Team management is handled via Clerk. Use the user menu to invite team members.</p>
              <Button variant="outline" className="mt-3" size="sm">Manage Team in Clerk</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
