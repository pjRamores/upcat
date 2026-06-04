import type { VercelRequest, VercelResponse } from "@vercel/node";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({success: false, error: "Method not allowed"});
    }

    const secret = String(req.headers["x-cron-secret"] ?? "");
    const expected = String(process.env.CRON_SECRET ?? "");
    if (!expected || secret !== expected) {
        return res.status(401).json({success: false, error: "Unauthorized"});
    }

    const db = await getDb();
    const assets = db.collection("question_media_assets");
    const questions = db.collection("questions");

    const staleSoftDeletedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14);

    const softDeleted = await assets
        .find({isDeleted: true, deletedAt: {$lte: staleSoftDeletedAt}}, {projection: {_id: -1}})
        .limit(500)
        .toArray();

    const hardDeleteIds = [] as import("mongodb").ObjectId[];
    for (const asset of softDeleted) {
        const refs = await questions.countDocuments({mediaAssetIds: asset._id, isDeleted: {$ne: true}});
        if (refs === 0) hardDeleteIds.push(asset._id);
    }

    const hardDeleteResult = hardDeleteIds.length
        ? await assets.deleteMany({_id: {$in: hardDeleteIds}})
        : {deletedCount: 0};

    return res.status(200).json({
        success: true,
        data: {
            candidatesChecked: softDeleted.length,
            hardDeleted: hardDeleteResult.deletedCount,
        },
    });
}