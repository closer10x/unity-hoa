import { notFound } from "next/navigation";

import { buildWelcomeEmailHtml } from "@/lib/email/send-welcome-email";

/**
 * Dev-only preview of the team-invite welcome email, rendered from the real
 * template so the preview can never drift from what actually gets sent.
 */
export default function WelcomeEmailPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  const html = buildWelcomeEmailHtml({
    name: "Jordan Rivera",
    email: "jordan@unitygridmanagement.com",
    role: "Community manager",
    setPasswordUrl:
      "http://localhost:3001/auth/confirm?token_hash=preview-token&type=invite&next=/admin",
    loginUrl: "http://localhost:3001/admin/login",
  });

  return (
    <main style={{ background: "#f4f6ef", minHeight: "100vh", paddingTop: 24 }}>
      <p style={{ maxWidth: 560, margin: "0 auto", padding: "0 16px", fontFamily: "ui-monospace, monospace", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "#8a938a" }}>
        Dev preview — welcome email as delivered
      </p>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
