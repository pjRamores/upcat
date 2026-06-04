/**
 * Cron: hourly threat-score decay.
 * Schedule: 0.*.*.*.*
 *
 * Subtracts `THREAT_SCORE_DECAY_PER_HOUR` from every IP record (clamped to 0)
 * and resets the daily activity counters at UTC midnight. Reputation is
 * recomputed from the new score so neutral-but-noisy IPs gradually return
 * to a clean state without manual intervention.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { AnyBulkWriteOperation } from "mongodb";
import { classifyThreatScore, THREAT_SCORE_MIN } from "@upcat/shared";
import { getDb } from "../src/db.js";
import { requireCronAuth } from "../src/cronAuth.js";

const DECAY_PER_HOUR = 2;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;
  const db = await getDb();
  const now = new Date();
  const isMidnightUtc = now.getUTCHours() === 0;

  // Find every IP with a non-zero score, decay in batches.
  const cursor = db
    .collection("ip_intelligence")
    .find({ threatScore: {$gt: THREAT_SCORE_MIN} })
    .project({ _id: 1, threatScore: 1 });

  let decayed = 0;
  const batch: AnyBulkWriteOperation[] = [];
  for await (const row of cursor) {
    const oldScore = row.threatScore as number;
    const newScore = Math.max(THREAT_SCORE_MIN, oldScore - DECAY_PER_HOUR);
    if (newScore === oldScore) continue;
    batch.push({
      updateOne: {
        filter: { _id: row._id },
        update: {
          $set: {
            threatScore: newScore,
            reputation: classifyThreatScore(newScore),
            updatedAt: now,
          },
        },
      },
    });
    decayed++;
    if (batch.length >= 500) {
      await db.collection("ip_intelligence").bulkWrite(batch);
      batch.length = 0;
    }
  }
  if (batch.length) await db.collection("ip_intelligence").bulkWrite(batch);

  // Daily counter reset at UTC midnight.
  let reset = 0;
  if (isMidnightUtc) {
    const r = await db.collection("ip_intelligence").updateMany(
      {},
      {
        $set: {
          "activity.requestsToday": 0,
          "activity.failedLoginsToday": 0,
          "activity.accountsCreatedToday": 0,
        },
      },
    );
    reset = r.modifiedCount;
  }

  res.status(200).json({ success: true, data: { decayed, reset, isMidnightUtc } });
}