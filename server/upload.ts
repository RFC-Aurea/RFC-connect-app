import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// MIME type and size configuration
// ---------------------------------------------------------------------------

export type AttachmentType = "photo" | "document" | "voice";

export const ALLOWED_MIMES: Record<AttachmentType, string[]> = {
  photo: ["image/jpeg", "image/png", "image/heic", "image/heif"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  voice: ["audio/mp4", "audio/m4a", "audio/mpeg", "audio/x-m4a"],
};

const SIZE_LIMITS: Record<AttachmentType, number> = {
  photo: 10 * 1024 * 1024,     // 10 MB
  document: 25 * 1024 * 1024,  // 25 MB
  voice: 5 * 1024 * 1024,      // 5 MB
};

// The multer global limit is the highest allowed (documents at 25 MB).
// Per-type size enforcement happens in the route handler after the upload.
const MAX_UPLOAD_BYTES = SIZE_LIMITS.document;

// All MIME types that are accepted at the multer filter level.
const allAllowedMimes = new Set(Object.values(ALLOWED_MIMES).flat());

// ---------------------------------------------------------------------------
// Multer — memory storage
// ---------------------------------------------------------------------------

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (allAllowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type '${file.mimetype}' is not allowed`));
    }
  },
});

// ---------------------------------------------------------------------------
// R2 / S3 client
// ---------------------------------------------------------------------------

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;

export const storageEnabled = !!(
  r2AccountId &&
  r2AccessKeyId &&
  r2SecretAccessKey &&
  r2BucketName
);

let s3: S3Client | null = null;

if (storageEnabled) {
  s3 = new S3Client({
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    region: "auto",
    credentials: {
      accessKeyId: r2AccessKeyId!,
      secretAccessKey: r2SecretAccessKey!,
    },
  });
} else {
  console.warn(
    "[upload] R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_BUCKET_NAME not set — " +
      "files will be saved locally to ./uploads/",
  );
}

// Local uploads directory (dev mode only)
const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// ---------------------------------------------------------------------------
// uploadFile
// ---------------------------------------------------------------------------

/**
 * Uploads a file buffer to R2 (production) or the local ./uploads/ directory
 * (dev / storageEnabled=false).
 *
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  type: AttachmentType,
): Promise<string> {
  const ext = path.extname(originalFilename) || "";
  const uuid = randomUUID();
  const key = `${type}s/${uuid}${ext}`; // e.g. photos/uuid.jpg

  if (storageEnabled && s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: r2BucketName!,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    // Public R2 URL
    return `https://${r2BucketName}.${r2AccountId}.r2.cloudflarestorage.com/${key}`;
  }

  // Dev fallback: write to local filesystem
  const localDir = path.join(LOCAL_UPLOADS_DIR, `${type}s`);
  fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, `${uuid}${ext}`), buffer);
  return `/uploads/${key}`;
}

/** Per-type max size in bytes — used by the route handler for validation. */
export function maxSizeForType(type: AttachmentType): number {
  return SIZE_LIMITS[type];
}
