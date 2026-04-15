"use client";

import type { CategoryWithCount } from "@/lib/types/documents";

type Props = {
  categories: CategoryWithCount[];
  activeCategoryId: string | null;
  onCategoryChange: (id: string | null) => void;
};

export function CategorySidebar({ categories, activeCategoryId, onCategoryChange }: Props) {
  const totalCount = categories.reduce((sum, c) => sum + c.document_count, 0);

  return (
    <nav className="hidden lg:block w-56 shrink-0" aria-label="Document categories">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        Categories
      </h2>
      <ul className="space-y-0.5">
        <li>
          <button
            onClick={() => onCategoryChange(null)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeCategoryId === null
                ? "bg-white text-secondary shadow-sm"
                : "text-on-surface-variant hover:bg-white/60 hover:text-on-surface"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
              All Documents
            </span>
            <span className="text-xs tabular-nums text-on-surface-variant">{totalCount}</span>
          </button>
        </li>
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              onClick={() => onCategoryChange(cat.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeCategoryId === cat.id
                  ? "bg-white text-secondary shadow-sm"
                  : "text-on-surface-variant hover:bg-white/60 hover:text-on-surface"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                <span className="truncate">{cat.name}</span>
              </span>
              {cat.document_count > 0 && (
                <span className="ml-2 text-xs tabular-nums text-on-surface-variant">
                  {cat.document_count}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  onCategoryChange,
}: Props) {
  return (
    <div className="lg:hidden -mx-4 px-4 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 pb-2">
        <button
          onClick={() => onCategoryChange(null)}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            activeCategoryId === null
              ? "bg-secondary text-white"
              : "bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategoryId === cat.id
                ? "bg-secondary text-white"
                : "bg-white text-on-surface-variant border border-outline-variant hover:bg-surface-container-low"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
