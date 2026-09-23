import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';
import crypto from 'crypto';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;

  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    logger.warn('[StorageService] AWS S3 credentials missing in environment.');
    return null;
  }

  s3Client = new S3Client({
    region: env.AWS_REGION || 'us-east-2',
    endpoint: env.AWS_ENDPOINT_URL_S3 || undefined,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  return s3Client;
}

export interface UploadedAttachment {
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  url: string;
}

export class StorageService {
  /**
   * Upload an attachment to user-specific directory in Neon S3 bucket.
   * Path format: users/{userId}/attachments/{uuid}-{filename}
   */
  public static async uploadUserAttachment(
    userId: string | null | undefined,
    attachment: { filename: string; contentType: string; content: string; size?: number }
  ): Promise<UploadedAttachment> {
    const client = getS3Client();
    const bucket = env.S3_BUCKET_NAME || 'attachments';
    const userPrefix = userId ? `users/${userId}` : 'users/public';
    const uniqueId = crypto.randomUUID();
    const cleanFilename = attachment.filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const s3Key = `${userPrefix}/attachments/${uniqueId}-${cleanFilename}`;

    // Extract raw base64 buffer
    const base64Match = attachment.content.match(/^data:.*?;base64,(.*)$/s);
    const rawBase64 = base64Match ? base64Match[1] : attachment.content;
    const buffer = Buffer.from(rawBase64, 'base64');
    const contentType = attachment.contentType || 'application/octet-stream';

    if (client) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
          })
        );
        logger.info(`[StorageService] Successfully uploaded attachment to S3 key: ${s3Key}`);
      } catch (err) {
        logger.error(`[StorageService] Failed to upload attachment to S3: ${(err as Error).message}`);
      }
    }

    // Generate presigned URL for viewing/downloading (valid for 7 days)
    let url = attachment.content; // fallback to base64 if S3 fails
    if (client) {
      try {
        url = await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: bucket,
            Key: s3Key,
          }),
          { expiresIn: 7 * 24 * 3600 }
        );
      } catch (e) {
        logger.error(`[StorageService] Failed to generate signed URL: ${(e as Error).message}`);
      }
    }

    return {
      filename: attachment.filename,
      contentType,
      size: attachment.size || buffer.length,
      s3Key,
      url,
    };
  }
}
