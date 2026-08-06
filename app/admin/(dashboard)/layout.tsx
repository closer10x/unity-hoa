import { requireAdminUser } from "@/lib/auth/require-admin";

/**
 * The portal supplies its own header and nav inside <Shell>, so this layout
 * only guards the route.
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();
  return <>{children}</>;
}
