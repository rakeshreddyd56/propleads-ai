"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, Globe, Send, MessageSquare,
  BarChart3, MapPin, Settings, Zap,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/scraping", label: "Lead Sources", icon: Globe },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/coach", label: "AI Coach", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/market", label: "Market Intel", icon: MapPin },
  { href: "/settings/plan", label: "Plans & Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside data-tour="sidebar" className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-white dark:bg-zinc-950">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Zap className="h-7 w-7 text-orange-500" />
        <span className="text-xl font-bold tracking-tight">PropLeads AI</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
