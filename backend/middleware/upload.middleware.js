const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const httpError = require("../utils/httpError");

const uploadsRoot = path.join(process.cwd(), "uploads");
const postsDir = path.join(uploadsRoot, "posts");
const communitiesDir = path.join(uploadsRoot, "communities");

fs.mkdirSync(postsDir, { recursive: true });
fs.mkdirSync(communitiesDir, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",

  "application/pdf",
  "text/plain",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  "application/zip",
  "application/x-zip-compressed",
]);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

function createStorage(folder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      if (folder === "posts") {
        cb(null, postsDir);
      } else if (folder === "communities") {
        cb(null, communitiesDir);
      } else {
        cb(httpError(500, "Некорректная папка загрузки файлов"));
      }
    },

    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;

      cb(null, fileName);
    },
  });
}

function postAttachmentFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(httpError(400, "Недопустимый формат файла"));
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(httpError(400, "Недопустимый тип файла"));
  }

  cb(null, true);
}

function communityAvatarFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return cb(httpError(400, "Аватарка сообщества должна быть изображением"));
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return cb(httpError(400, "Недопустимый тип изображения"));
  }

  cb(null, true);
}

const uploadPostAttachments = multer({
  storage: createStorage("posts"),
  fileFilter: postAttachmentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 4,
  },
});

const uploadCommunityAvatar = multer({
  storage: createStorage("communities"),
  fileFilter: communityAvatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  uploadPostAttachments,
  uploadCommunityAvatar,
};