import AssistantWidget from "@/components/assistant/AssistantWidget";
import { requireResidentUser } from "@/lib/auth/require-resident";

/**
 * The portal supplies its own header and nav inside <Shell>, so this layout
 * only guards the route and floats the assistant.
 */
export default async function ResidentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireResidentUser();
  return (
    <>
      {children}
      <AssistantWidget />
    </>
  );
}
