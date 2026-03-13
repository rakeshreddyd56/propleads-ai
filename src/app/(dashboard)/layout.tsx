import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { QuickTour } from "@/components/onboarding/quick-tour";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar />
      <div className="ml-64">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
      <QuickTour />
    </div>
  );
}
