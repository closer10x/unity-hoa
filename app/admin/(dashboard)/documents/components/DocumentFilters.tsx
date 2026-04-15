"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CategoryWithCount, DocumentFilters as Filters } from "@/lib/types/documents";

type Props = {
  categories: CategoryWithCount[];
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (v: "grid" | "list") => void;
};

const ACCESS_LEVELS = [
  { value: "", label: "All access levels" },
  { value: "public", label: "Public" },
  { value: "resident", label: "Resident" },
  { value: "board", label: "Board Only" },
  { value: "manager_only", label: "Manager Only" },
] as const;

const FILE_TYPES = [
  { value: "", label: "All file types" },
  { value: "application/pdf", label: "PDF" },
  { value: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word" },
  { value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel" },
  { value: "image/", label: "Image" },
] as const;

const DATE_RANGES = [
  { value: "", label: "Any time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "a-z", label: "A → Z" },
  { value: "z-a", label: "Z → A" },
  { value: "most-downloaded", label: "Most downloaded" },
  { value: "recently-updated", label: "Recently updated" },
] as const;

export function DocumentFilters({ categories, filters, onFiltersChange, viewMode, onViewModeChange }: Props) {
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = useCallback(
    (val: string) => {
      setSearchInput(val);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onFiltersChange({ ...filters, search: val || undefined });
      }, 300);
    },
    [filters, onFiltersChange],
  );

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const activeFilterCount = [
    filters.categoryId,
    filters.accessLevel,
    filters.fileType,
    filters.dateRange,
    filters.showArchived,
  ].filter(Boolean).length;

  const clearAll = () => {
    setSearchInput("");
    onFiltersChange({});
  };

  return (
    <div className="sticky top-0 z-20 -mx-4 bg-surface/95 backdrop-blur-sm px-4 pb-4 pt-2 border-b border-outline-variant/30">
      {/* Search + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by title, description, or filename…"
            className="w-full rounded-lg border border-outline-variant/50 bg-white py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-shadow"
            aria-label="Search documents"
          />
          {searchInput && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
        <div className="hidden sm:flex items-center rounded-lg border border-outline-variant/50 bg-white p-0.5">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-secondary text-white"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            aria-label="Grid view"
          >
            <span className="material-symbols-outlined text-[20px]">grid_view</span>
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-secondary text-white"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            aria-label="List view"
          >
            <span className="material-symbols-outlined text-[20px]">view_list</span>
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={filters.accessLevel ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              accessLevel: e.target.value ? (e.target.value as Filters["accessLevel"]) : undefined,
            })
          }
          className="rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"
          aria-label="Filter by access level"
        >
          {ACCESS_LEVELS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.fileType ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, fileType: e.target.value || undefined })
          }
          className="rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"
          aria-label="Filter by file type"
        >
          {FILE_TYPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.dateRange ?? ""}
          onChange={(e) =>
            onFiltersChange({
              ...filters,
              dateRange: e.target.value ? (e.target.value as Filters["dateRange"]) : undefined,
            })
          }
          className="rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"
          aria-label="Filter by date"
        >
          {DATE_RANGES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={filters.sort ?? "newest"}
          onChange={(e) =>
            onFiltersChange({ ...filters, sort: e.target.value as Filters["sort"] })
          }
          className="rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary"
          aria-label="Sort documents"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-sm text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filters.showArchived ?? false}
            onChange={(e) =>
              onFiltersChange({ ...filters, showArchived: e.target.checked || undefined })
            }
            className="accent-secondary"
          />
          Archived
        </label>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-full bg-error-container px-3 py-1.5 text-xs font-medium text-on-error-container transition-colors hover:bg-error-container/80"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>
    </div>
  );
}
