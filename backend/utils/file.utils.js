const fs = require("fs/promises");
const path = require("path");

const uploadsRoot = path.join(process.cwd(), "uploads");

async function removeFileByPath(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (e) {
    // Файл мог быть уже удален.
    // Ошибку не пробрасываем, чтобы не ломать основной запрос.
  }
}

function fileUrlToPath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== "string") {
    return null;
  }

  if (!fileUrl.startsWith("/uploads/")) {
    return null;
  }

  const relativePath = fileUrl.replace("/uploads/", "");
  const absolutePath = path.join(uploadsRoot, relativePath);

  const normalizedUploadsRoot = path.normalize(uploadsRoot);
  const normalizedAbsolutePath = path.normalize(absolutePath);

  if (!normalizedAbsolutePath.startsWith(normalizedUploadsRoot)) {
    return null;
  }

  return normalizedAbsolutePath;
}

exports.cleanupUploadedFiles = async (files = []) => {
  await Promise.all(
    files.map(async (file) => {
      await removeFileByPath(file.path);
    })
  );
};

exports.deleteFilesByUrls = async (fileUrls = []) => {
  await Promise.all(
    fileUrls.map(async (fileUrl) => {
      const filePath = fileUrlToPath(fileUrl);
      await removeFileByPath(filePath);
    })
  );
};