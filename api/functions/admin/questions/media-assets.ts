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
            id: existing._id.toString(),
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
    kind: kind === "image" || kind === "audio" || kind === "video" ? "other" : kind,
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
{ id: oid, isDeleted: {$ne: true}},
{$set: {isDeleted: true, deletedAt: now, deletedBy: adminId, updatedAt: now}},
);
if (!result.matchedCount) {
    return res.status(404).json({success: false, error: "Asset not found"});
}
await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question.media_asset_deleted",
    targetType: "question_media_asset",
    targetId: oid,
});
return res.status(200).json({success: true, data: {deleted: true}});
}