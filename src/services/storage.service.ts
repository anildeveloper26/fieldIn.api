import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";
import { ApiError } from "../middleware/errorHandler";

const PRESIGNED_URL_TTL_SECONDS = 60 * 60;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSION_BY_MIME);

let client: S3Client | null = null;

function isConfigured(): boolean {
  const { endpoint, accessKeyId, secretAccessKey, bucket } = env.r2;
  return Boolean(endpoint && accessKeyId && secretAccessKey && bucket);
}

function getClient(): S3Client {
  if (!isConfigured()) {
    throw new ApiError(503, "File storage is not configured");
  }
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: env.r2.endpoint,
      credentials: {
        accessKeyId: env.r2.accessKeyId!,
        secretAccessKey: env.r2.secretAccessKey!,
      },
    });
  }
  return client;
}

/** Uploads an image under `<prefix>/<folder>/<owner>/<uuid>.<ext>` and returns
 * the object key. Keys (not URLs) are what get stored in Postgres, so the
 * bucket can move from private to public without a data migration. */
export async function uploadImage(folder: string, ownerId: string, file: Express.Multer.File): Promise<string> {
  const extension = EXTENSION_BY_MIME[file.mimetype];
  if (!extension) {
    throw new ApiError(400, "Only JPEG, PNG or WebP images are allowed");
  }

  const key = `${env.r2.keyPrefix}/${folder}/${ownerId}/${randomUUID()}.${extension}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );
  return key;
}

/** Turns a stored value into something a browser can load. Absolute URLs
 * (e.g. seeded placeholder images) pass through untouched. */
export async function resolveFileUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  if (env.r2.publicBaseUrl) return `${env.r2.publicBaseUrl.replace(/\/$/, "")}/${value}`;
  if (!isConfigured()) return null;

  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: env.r2.bucket, Key: value }), {
    expiresIn: PRESIGNED_URL_TTL_SECONDS,
  });
}
