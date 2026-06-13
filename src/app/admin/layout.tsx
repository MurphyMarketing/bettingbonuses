import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

/**
 * Admin layout: a persistent left sidebar + content area for every /admin route.
 * Server component, so admin pages stay server-rendered. The sidebar only shows
 * for an authenticated admin — /admin/login (the one pre-auth route) renders
 * bare. Auth itself is enforced by the proxy; this is just the UI boundary.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
