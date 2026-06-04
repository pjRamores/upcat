import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ObjectId } from "mongodb";
import { requireAdmin } from '../../../../../src/auth.js';
import { getDb } from '../../../../../src/db.js';
import { logActivity } from '../../../../../src/activityLog.js';

const MAX_BYTES = Number(process.env.QUESTION_MEDIA_MAX_BYTES ?? 8 * 1024 * 1024);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    if (req.method === "GET") return listAssets(req, res);
    if (req.method === "POST") return createAsset(req, res, admin._id);
    if (req.method === "DELETE") return softDeleteAsset(req, res, admin._id);

    res.setHeader("Allow", "GET,POST,DELETE");
    return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function listAssets(req: VercelRequest, res: VercelResponse) {
    const db = await getDb();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 24));
    const includeDeleted = req.query.includeDeleted === "true";
    const kind = String(req.query.kind ?? "").trim();
    const setId = String(req.query.setid ?? "").trim();

    const filter: Record<string, unknown> = {};
    if (!includeDeleted) filter.isDeleted = {$ne: true};
    if (kind) filter.kind = kind;

    if (setId) {
        const raw = await db
            .collection("questions")
            .distinct("mediaAssetIds", {
                setId,
                mediaAssetIds: {$exists: true, $not: {$size: 0}},
                isDeleted: {$ne: true}
            });
        const { ObjectId } = await import("mongodb");
        const assetIds = raw.flatMap((id: unknown) => {
            try {
                return [new ObjectId(String(id))];
            } catch {
                return [];
            }
        });
        filter._id = {$in: assetIds};
    }

    const [items, total] = await Promise.all([
        db
            .collection("question_media_assets")
            .find(filter)
            .sort({createdAt: -1})
            .skip((page - 1) * limit)
            .limit(limit)
            .project({
                filename: 1,
                mimeType: 1,
                size: 1,
                sha256: 1,
                kind: 1,
                altText: 1,
                caption: 1,
                createdAt: 1,
                isDeleted: 1
            })
            .toArray(),
        db.collection("question_media_assets").countDocuments(filter),
    ]);

    return res.status(200).json({
        success: true,
        data: {
            items: items.map((asset) => ({
                _id: asset._id.toString(),
                filename: asset.filename,
                mimeType: asset.mimeType,
                size: asset.size,
                sha256: asset.sha256,
                kind: asset.kind,
                altText: asset.altText,
                caption: asset.caption,
                createdAt: asset.createdAt,
                isDeleted: asset.isDeleted ?? false,
            })),
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    });
}

async function createAsset(req: VercelRequest, res: VercelResponse, adminId: ObjectId) {
    const filename = String(req.body?.filename ?? "").trim();
    const mimeType = String(req.body?.mimeType ?? "").trim();
    const base64Data = String(req.body?.base64Data ?? "").trim();
    const kind = String(req.body?.kind ?? "other").trim();
    const altText = String(req.body?.altText ?? "").trim();
    const caption = String(req.body?.caption ?? "");
if (!filename || !mimeType || !base64Data) {
    return res.status(400).json({success: false, error: "filename, mimeType, and base64Data are required"});
}

const buffer = Buffer.from(base64Data, "base64");
if (buffer.length === 0) {
    return res.status(400).json({success: false, error: "Uploaded file is empty"});
}
if (buffer.length > MAX_BYTES) {
    return res.status(413).json({success: false, error: "Asset exceeds 8MB limit"});
}

const sha256 = createHash("sha256").update(buffer).digest("hex");
const db = await getDb();
const collection = db.collection("question_media_assets");

const existing = await collection.findOne({sha256, size: buffer.length, isDeleted: {$ne: true}});
if (existing) {
    return res.status(200).json({
        success: true,
        data: {
            _id: existing._id.toString(),
            deduped: true,
            filename: existing.filename,
            mimeType: existing.mimeType,
            size: existing.size,
            sha256: existing.sha256,
            kind: existing.kind,
            altText: existing.altText,
            caption: existing.caption,
            createdAt: existing.createdAt,
        },
    });
}

const now = new Date();
const doc = {
    filename,
    mimeType,
    kind: kind === "image" || kind === "audio" || kind === "video" ? kind : "other",
    size: buffer.length,
    sha256,
    altText: altText || undefined,
    caption: caption || undefined,
    dataBase64: base64Data,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
};
const result = await collection.insertOne(doc);

await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question.media_asset_created",
    targetType: "question_media_asset",
    targetId: result.insertedId,
    metadata: {
        filename,
        mimeType,
        size: buffer.length,
        sha256,
        kind: doc.kind,
    },
});

return res.status(201).json({
    success: true,
    data: {
        id: result.insertedId.toString(),
        deduped: false,
        filename,
        mimeType,
        size: buffer.length,
        sha256,
        kind: doc.kind,
        altText: doc.altText,
        caption: doc.caption,
        createdAt: now,
    },
});

async function softDeleteAsset(req: VercelRequest, res: VercelResponse, adminId: ObjectId) {
    const id = String(req.query.id ?? req.body?.id ?? "");
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({success: false, error: "Invalid asset id"});
    }
    const oid = new ObjectId(id);
    const db = await getDb();
    const now = new Date();

    const inUse = await db.collection("questions").countDocuments({
        mediaAssetIds: oid,
        isDeleted: {$ne: true},
    });
    if (inUse > 0) {
        return res.status(409).json({success: false, error: "Asset is referenced by active questions"});
    }

    const result = await db.collection("question_media_assets").updateOne(
{ _id: oid, isDeleted: { $ne: true }},
{ $set: { isDeleted: true, deletedAt: now, deletedBy: adminId, updatedAt: now}},
);
if (!result.matchedCount) {
    return res.status(404).json({ success: false, error: "Asset not found"});
}

await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question.media_asset_deleted",
    targetType: "question_media_asset",
    targetId: oid,
});

return res.status(200).json({ success: true, data: { deleted: true}});
}