import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { QuickTour } from "@/components/onboarding/quick-tour";
import { SidebarProvider } from "@/components/layout/sidebar-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Sidebar />
        <div className="md:ml-56">
          <Topbar />
          <main className="p-4 md:p-6">{children}</main>
        </div>
        <QuickTour />
      </div>
    </SidebarProvider>
  );
}
