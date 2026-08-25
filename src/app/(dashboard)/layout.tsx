import { requireActiveMembership } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, membership } = await requireActiveMembership();

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <DashboardHeader user={session.user} membership={membership} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
