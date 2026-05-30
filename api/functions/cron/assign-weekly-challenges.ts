/**
 * Cron: assign-weekly-challenges
 * Schedule: Mondays 04:00 UTC (`0.4*.*1`).
 *
 * For each active user:
 * - if they have no weekly challenge, or their current one is expired or completed (whether or not the reward was claimed), assign a fresh one.
 * - the new assignment expires 7 days after assignment.
 * Runs in bulk; idempotent within a minute.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import type {Db, Document, WithId} from "mongodb";
import {requireCronAuth} from "../../src/cronAuth.js";
import {getDb} from "../../src/db.js";
import type {WeeklyChallengeDef} from "@upcat/shared";

function pickWeighted<T extends {weight?: number}>(items: T[]): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((s, c) => s + (c.weight || 1), 0);
  let r = Math.random() * total;
  for (const c of items) {
    r -= c.weight || 1;
    if (r <= 0) return c;
  }
  return items[items.length - 1];
}

async function assignTo(
  db: Db,
  user: WithId<Document>,
  pool: WeeklyChallengeDef[],
  now: Date,
) : Promise<boolean> {
  const chal = pickWeighted(pool);
  if (!chal) return false;
  const expiresAt = new Date(now.getTime() + 7 * 24 * 3_600_000);
  await db.collection("users").updateOne(
    {_id: user._id},
    {
      $set: {
        "gamification.weeklyChallenge": {
          challengeId: chal.id,
          assignedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          progress: 0,
          target: chal.target,
          completed: false,
          completedAt: null,
          rewardClaimed: false,
        },
      },
    },
  );
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireCronAuth(req, res)) return;
  const db = await getDb();
  const pool = (await db
    .collection("weekly_challenges_catalog")
    .find({isActive: true})
    .toArray()).as unknown as WeeklyChallengeDef[];
  if (pool.length === 0) {
    return res
    .status(200)
    .json({success: true, data: {assigned: 0, skipped: 0, reason: "no active challenges"}});
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const users = await db
    .collection("users")
    .find(
      {
        isActive: true,
        $or: [
          {"gamification.weeklyChallenge": null},
          {"gamification.weeklyChallenge": {$exists: false}},
          {"gamification.weeklyChallenge.expiresAt": {$lt: nowIso}},
          {"gamification.weeklyChallenge.completed": true},
        ],
      },
      {projection: {_id: 1}},
    )
    .toArray();

  let assigned = 0;
  for (const u of users) {
    if (await assignTo(db, u, pool, now)) assigned += 1;
  }

  return res.status(200).json({
    success: true,
    data: {assigned, candidates: users.length, poolSize: pool.length},
  });
}