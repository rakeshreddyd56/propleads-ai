"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Users, Globe, Send, MessageSquare,
  BarChart3, MapPin, Settings, Zap, X,
} from "lucide-react";
import { useSidebar } from "./sidebar-context";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/scraping", label: "Lead Sources", icon: Globe },
  { href: "/outreach", label: "Outreach", icon: Send },
  { href: "/coach", label: "AI Coach", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/market", label: "Market Intel", icon: MapPin },
];

const settingsNavItems = [
  { href: "/settings/plan", label: "Plans & Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b px-5">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-orange-500" />
          <span className="text-xl font-bold tracking-tight">PropLeads AI</span>
        </div>
        {/* Close button visible only on mobile */}
        <button
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 md:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1.5">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Section divider */}
        <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />

        <div className="space-y-1.5">
          {settingsNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop sidebar: always visible at md+ */}
      <aside
        data-tour="sidebar"
        className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col border-r bg-white dark:bg-zinc-950 md:flex"
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar: overlay with backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={close}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <aside className="relative z-10 flex h-screen w-56 flex-col bg-white shadow-xl dark:bg-zinc-950">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
