/**
 * Cron: clean up expired data exports.
 * Schedule: 0 */\6 ***** (every 6 hours)
 *
 * For each export whose `export.expiresAt` < now:
 * ...- Delete the inline blob and/or GridFS payload.
 * ...- Update status -> "completed" (download window expired).
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {GridFSBucket, ObjectId} from "mongodb";
import {getDb} from "../../src/db.js";
import {requireCronAuth} from "../../src/cronAuth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;
  const db = await getDb();
  const bucket = new GridFSBucket(db, {bucketName: "data_exports"});
  const expired = await db
    .collection("data_requests")
    .find({
      type: "export",
      status: "ready",
      "export.expiresAt": {$lt: new Date()},
    })
    .limit(200)
    .toArray();

  let cleaned = 0;
  for (const doc of expired) {
    try {
      const gridId = doc.export?.gridFsId as ObjectId | undefined;
      if (gridId) {
        await bucket.delete(gridId).catch(() => undefined);
      }
      await db.collection("data_requests").updateOne(
        {id: doc._id},
        {
          $set: {
            status: "completed",
            updatedAt: new Date(),
            "export.blob": null,
            "export.gridFsId": null,
            "export.fileUrl": null,
          },
        },
      );
      cleaned += 1;
    } catch {
      /* keep iterating */
    }
  }
  return res.status(200).json({
    success: true,
    data: {cleaned, scanned: expired.length},
  });
}