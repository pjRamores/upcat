import Busboy from "busboy";
import type { VercelRequest } from "@vercel/node";

export interface MultipartFile {
    fieldName: string;
    filename: string;
    mimeType: string;
    encoding: string;
    size: number;
    buffer: Buffer;
}

export interface MultipartResult {
    fields: Record<string, string>;
    files: Record<string, MultipartFile>;
}

export async function parseMultipart(req: VercelRequest): Promise<MultipartResult> {
    return await new Promise((resolve, reject) => {
        const contentType = req.headers["content-type"];
        if (!contentType) {
            reject(new Error("Missing content-type header"));
            return;
        }
        const bb = Busboy({ headers: req.headers as Record<string, string> });
        const fields: Record<string, string> = {};
        const files: Record<string, MultipartFile> = {};

        bb.on("field", (name, value) => {
            fields[name] = value;
        });

        bb.on("file", (name, stream, info) => {
            const chunks: Buffer[] = [];
            let size = 0;
            stream.on("data", (chunk: Buffer) => {
                chunks.push(chunk);
                size += chunk.length;
            });
            stream.on("end", () => {
                files[name] = {
                    fieldName: name,
                    filename: info.filename,
                    mimeType: info.mimeType,
                    encoding: info.encoding,
                    size,
                    buffer: Buffer.concat(chunks),
                };
            });
        });

        bb.on("error", (err) => reject(err));
        bb.on("finish", () => resolve({ fields, files }));
        (req as unknown as NodeJS.ReadableStream).pipe(bb);
    });
}