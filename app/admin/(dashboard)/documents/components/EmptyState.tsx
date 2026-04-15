"use client";

type Props = {
  hasFilters: boolean;
  onClearFilters?: () => void;
};

export function EmptyState({ hasFilters, onClearFilters }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-low">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant/50">
          {hasFilters ? "filter_list_off" : "folder_off"}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold text-on-surface">
        {hasFilters ? "No documents match your filters" : "No documents yet"}
      </h3>
      <p className="mt-1 text-sm text-on-surface-variant max-w-sm">
        {hasFilters
          ? "Try adjusting your search terms or removing some filters to find what you're looking for."
          : "Upload your first document to get started. CC&Rs, meeting minutes, budgets — everything your community needs in one place."}
      </p>
      {hasFilters && onClearFilters && (
        <button
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">filter_list_off</span>
          Clear all filters
        </button>
      )}
    </div>
  );
}
