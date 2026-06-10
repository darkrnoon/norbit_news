export function getFileName(fileUrl) {
  if (!fileUrl) return "Файл";

  const parts = String(fileUrl).split("/");
  return decodeURIComponent(parts[parts.length - 1] || "Файл");
}

export function getFileExtension(fileUrl) {
  const fileName = getFileName(fileUrl);
  const parts = fileName.split(".");

  if (parts.length < 2) return "";

  return parts[parts.length - 1].toUpperCase();
}

export function isImageAttachment(attachment) {
  if (attachment?.type === "image") return true;

  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(attachment?.file_url || "");
}

export function getFileSizeLabel(size) {
  if (!size) return "размер не указан";

  const mb = size / 1024 / 1024;

  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }

  const kb = size / 1024;
  return `${kb.toFixed(1)} KB`;
}