export type DocumentAccessLevel = "public" | "resident" | "board" | "manager_only";

export type DocumentCategoryRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  category_id: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  version: string;
  effective_date: string | null;
  expiration_date: string | null;
  tags: string[];
  access_level: DocumentAccessLevel;
  is_pinned: boolean;
  is_archived: boolean;
  requires_acknowledgment: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
  last_downloaded_at: string | null;
  download_count: number;
  view_count: number;
  superseded_by: string | null;
};

export type DocumentWithCategory = DocumentRow & {
  category: DocumentCategoryRow;
  uploader_name?: string | null;
  is_acknowledged?: boolean;
};

export type DocumentAcknowledgmentRow = {
  id: string;
  document_id: string;
  user_id: string;
  acknowledged_at: string;
  ip_address: string | null;
};

export type DocumentDownloadRow = {
  id: string;
  document_id: string;
  user_id: string;
  downloaded_at: string;
  ip_address: string | null;
  user_agent: string | null;
};

export type DocumentFilters = {
  search?: string;
  categoryId?: string;
  accessLevel?: DocumentAccessLevel;
  fileType?: string;
  dateRange?: "30" | "90" | "365" | "custom";
  dateFrom?: string;
  dateTo?: string;
  showArchived?: boolean;
  sort?: "newest" | "oldest" | "a-z" | "z-a" | "most-downloaded" | "recently-updated";
};

export type CategoryWithCount = DocumentCategoryRow & {
  document_count: number;
};

export type AcknowledgmentWithUser = DocumentAcknowledgmentRow & {
  user_display_name: string | null;
  user_email: string | null;
};
