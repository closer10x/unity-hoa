import type { Metadata } from "next";

import { getUploadLinkInfo } from "./actions";
import { UploadPortal } from "./components/UploadPortal";

export const metadata: Metadata = {
  title: "Secure Document Upload | Unity Grid Management",
  description: "Upload documents securely via a password-protected link.",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function UploadPage({ params }: Props) {
  const { token } = await params;
  const result = await getUploadLinkInfo(token);

  if (result.error || !result.link) {
    return <UploadPortal token={token} error={result.error ?? "Upload link not found"} />;
  }

  return (
    <UploadPortal
      token={token}
      link={result.link}
      categories={result.categories ?? []}
    />
  );
}
