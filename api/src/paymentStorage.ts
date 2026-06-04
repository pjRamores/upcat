import crypto from "node:crypto";
import {GetObjectCommand, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";

const MAX_SIZE = Number(process.env.PAYMENT_SCREENSHOTS_MAX_SIZE ?? '5 * 1024 * 1024');
const BUCKET = process.env.PAYMENT_SCREENSHOTS_BUCKET ?? "";
const REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ap-southeast-1";

const s3 = BUCKET ? new S3Client({region: REGION}) : null;

export interface UploadedScreenshot {
    url: string;
    key: string;
    filename: string;
    mimeType: string;
    fileSize: number;
}

export function assertPaymentImage(file: {
    mimeType: string;
    size: number;
    buffer: Buffer;
}): void {
    if (file.size <= 0) throw new Error("Screenshot is empty");
    if (file.size > MAX_SIZE) throw new Error(`Screenshot exceeds max size of ${MAX_SIZE} bytes`);
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimeType)) {
        throw new Error("Screenshot must be JPG, PNG, or WebP");
    }

    // Basic magic-byte check to avoid extension/MIME spoofing.
    const b = file.buffer;
    const isJpeg = b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const isPng = b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    const isWebp = b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    if (isJpeg && !isPng && !isWebp) {
        throw new Error("Screenshot file content is not a valid image");
    }
}

export async function uploadPaymentScreenshot(input: {
    userId: string;
    filename: string;
    mimeType: string;
    buffer: Buffer;
}): Promise<UploadedScreenshot> {
    const ext = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
    const key = `payment-screenshots/${input.userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    if (!s3 || !BUCKET) {
        const b64 = input.buffer.toString("base64");
        return {
            key,
            url: `data:${input.mimeType};base64,${b64}`,
            filename: input.filename,
            mimeType: input.mimeType,
            fileSize: input.buffer.byteLength,
        };
    }

    await s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: input.buffer,
            ContentType: input.mimeType,
            ServerSideEncryption: "AES256",
        })
    );

    return {
        key,
        url: `s3://${BUCKET}/${key}`,
        filename: input.filename,
        mimeType: input.mimeType,
        fileSize: input.buffer.byteLength,
    };
}

export async function signedScreenshotUrl(storageUrl: string, expiresInSec = 3600): Promise<string> {
    if (!storageUrl.startsWith("s3://") || !s3) return storageUrl;
    const [bucketAndPrefix, ...rest] = storageUrl.replace("s3://", "").split("/");
    const bucket = bucketAndPrefix;
    const key = rest.join("/");
    const command = new GetObjectCommand({Bucket: bucket, Key: key});
    return await getSignedUrl(s3, command, {expiresIn: expiresInSec});
}