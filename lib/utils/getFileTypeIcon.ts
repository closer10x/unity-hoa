type FileTypeInfo = { icon: string; color: string; label: string };

const FILE_TYPE_MAP: Record<string, FileTypeInfo> = {
  "application/pdf":                                           { icon: "picture_as_pdf", color: "text-red-600",    label: "PDF" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: "description",    color: "text-blue-600",   label: "DOCX" },
  "application/msword":                                        { icon: "description",    color: "text-blue-600",   label: "DOC" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":       { icon: "table_chart",    color: "text-green-600",  label: "XLSX" },
  "application/vnd.ms-excel":                                  { icon: "table_chart",    color: "text-green-600",  label: "XLS" },
  "image/png":                                                 { icon: "image",          color: "text-purple-600", label: "PNG" },
  "image/jpeg":                                                { icon: "image",          color: "text-purple-600", label: "JPEG" },
  "image/webp":                                                { icon: "image",          color: "text-purple-600", label: "WEBP" },
  "text/plain":                                                { icon: "article",        color: "text-gray-600",   label: "TXT" },
};

const FALLBACK: FileTypeInfo = { icon: "insert_drive_file", color: "text-slate-500", label: "File" };

export function getFileTypeInfo(mimeType: string): FileTypeInfo {
  return FILE_TYPE_MAP[mimeType] ?? FALLBACK;
}

export function getFileTypeFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const extMap: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    txt: "text/plain",
  };
  return extMap[ext] ?? "application/octet-stream";
}

export function isPreviewable(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
