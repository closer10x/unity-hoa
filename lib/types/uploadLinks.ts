export type UploadLinkRow = {
  id: string;
  label: string;
  password_hash: string;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
  max_uploads: number | null;
  upload_count: number;
  allowed_categories: string[];
  requires_review: boolean;
  is_active: boolean;
  last_used_at: string | null;
};

export type UploadLinkSessionRow = {
  id: string;
  upload_link_id: string;
  ip_address: string | null;
  user_agent: string | null;
  accessed_at: string;
  success: boolean;
};

export type PendingDocumentStatus = "pending" | "approved" | "rejected";

export type PendingDocumentRow = {
  id: string;
  upload_link_id: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  submitted_title: string;
  submitted_description: string | null;
  submitted_category: string | null;
  submitter_name: string | null;
  submitter_email: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  status: PendingDocumentStatus;
  rejection_reason: string | null;
};

export type PendingDocumentWithLink = PendingDocumentRow & {
  upload_link_label: string | null;
  category_name: string | null;
};

export type UploadLinkPublicInfo = {
  id: string;
  label: string;
  expires_at: string | null;
  max_uploads: number | null;
  upload_count: number;
  allowed_categories: string[];
  requires_review: boolean;
  is_active: boolean;
};
