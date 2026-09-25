import multer from "multer";
import { ALLOWED_IMAGE_TYPES } from "../services/storage.service";
import { ApiError } from "./errorHandler";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Single-image multipart parser, kept in memory since files go straight to R2. */
export const singleImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "Only JPEG, PNG or WebP images are allowed"));
    }
  },
}).single("file");
