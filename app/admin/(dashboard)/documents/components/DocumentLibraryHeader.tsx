"use client";

type Props = {
  totalDocuments: number;
  lastUpdated: string | null;
  onUploadClick: () => void;
  onManageLinksClick: () => void;
  pendingCount: number;
};

export function DocumentLibraryHeader({
  totalDocuments,
  lastUpdated,
  onUploadClick,
  onManageLinksClick,
  pendingCount,
}: Props) {
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
          Document Library
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {totalDocuments} document{totalDocuments !== 1 ? "s" : ""}
          {formattedDate ? ` · Last updated ${formattedDate}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onManageLinksClick}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-white px-4 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">lock</span>
          Secure Upload Links
        </button>
        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-secondary to-secondary-fixed-dim px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-secondary/20 transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          Upload Document
        </button>
      </div>
    </div>
  );
}
