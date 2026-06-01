import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const db = await getDb();
  const [byStatus, byReason] = await Promise.all([
    db
    .collection("question_flags")
    .aggregate([{$group: {_id: "$status", n: {$sum: 1}}}])
    .toArray(),
    db
    .collection("question_flags")
    .aggregate([{$group: {_id: "$reason", n: {$sum: 1}}}])
    .toArray(),
  ]);
  const toMap = (a: {_id: string; n: number}) => {
    a.reduce<Record<string, number>>((acc, r) => ({...acc, [String(r._id?? "unknown")]: r.n}), {});
    return res.status(200).json({
      success: true,
      data: {
        byStatus: toMap(byStatus as {_id: string; n: number}()),
        byReason: toMap(byReason as {_id: string; n: number}()),
      },
    });
  };
}