import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({success: false, error: "Method not allowed"});
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();

  const [
    mostViewedArticles,
    leastHelpfulArticles,
    noResultTerms,
    contextualDismissRates,
    onboardingCompletions,
    feedbackSummaryAgg,
    comments,
    ] = await Promise.all([
      db.collection("help_articles").find({status: "published"}).project({
        _id: 0,
        slug: 1,
        title: 1,
        viewCount: 1
      }).sort({viewCount: -1}).limit(10).toArray(),
      db.collection("help_articles").aggregate([
        {$match: {status: "published"}},
      ],
      {
        $project: {
          slug: 1,
          title: 1,
          helpfulCount: 1,
          notHelpfulCount: 1,
          helpfulRate: {
            $cond: [
              {$gt: [{$add: ["$helpfulCount", "$notHelpfulCount"]], 0}],
              {$divide: ["$helpfulCount", {$add: ["$helpfulCount", "$notHelpfulCount"]]}],
              1,
            ],
          },
        },
        {$sort: {helpfulRate: 1, notHelpfulCount: -1}},
        {$limit: 10},
        {$project: {_id: 0, slug: 1, title: 1, helpfulRate: 1, helpfulCount: 1, notHelpfulCount: 1}},
        }).toArray(),
        db.collection("help_search_analytics").find({resultsCount: 0}).sort({count: -1}).limit(20).toArray(),
        db.collection("contextual_help").aggregate([
          {
            $lookup: {
              from: "users",
              let: {helpId: "$_id"},
              pipeline: [
                {$match: {$expr: {$in: ["$helpId", {$ifNull: ["$help.dismissedHelp", []]]]}}},
                {$count: "dismissed"},
              ],
              as: "dismissals",
            },
          },
          {
            $project: {
              _id: 1,
              title: 1,
              page: 1,
              dismissCount: {$ifNull: [{$first: "$dismissals.dismissed"}, 0}]},
              },
          },
          {$sort: {dismissCount: -1}},
          }).toArray(),
          db.collection("users").aggregate([
            {$project: {help: 1}},
          ],
          {
            $project: {
              entries: {
                $objectToArray: {$ifNull: ["$help.onboardingCompleted", {}]}},
              },
          },
          },
          {$unwind: "$entries"},
          {
            $group: {
              _id: "$entries.k",
              completed: {$sum: {$cond: [{$ne: ["$entries.v.completedAt", null]], 1, 0}]},
              skipped: {$sum: {$cond: [{$ne: ["$entries.v.skippedAt", null]], 1, 0}]},
              avgSteps: {$avg: "$entries.v.stepsCompleted"},
              started: {$sum: 1},
              },
          },
          },
          }).toArray(),
          db.collection("help_feedback").aggregate([
            {
              $group: {
                _id: null,
                helpful: {$sum: {$cond: ["$helpful", 1, 0}]},
                notHelpful: {$sum: {$cond: ["$helpful", 0, 1}]},
                withComments: {$sum: {$cond: [{$and: [{$ne: ["$comment", null]], {$ne: ["$comment", """]}]], 1, 0}]},
              },
          },
          },
          }).toArray(),
db.collection("help_feedback").find({
comment: {
type: "string",
ne: ""
})
).sort({createdAt: -1}).limit(50).toArray(),
});
const onboardingCompletionRates = Object.fromEntries(
onboardingCompletions.map((row) => [String(row._id), {
started: Number(row.started ?? 0),
completed: Number(row.completed ?? 0),
skipped: Number(row.skipped ?? 0),
avgSteps: Number((row.avgSteps ?? 0).toFixed?.(2) ?? row.avgSteps ?? 0),
}])
);
return res.status(200).json({
success: true,
data: {
mostViewedArticles,
leastHelpfulArticles,
searchTermsWithNoResults: noResultTerms,
onboardingCompletionRates,
contextualHelpDismissRates: contextualDismissRates.map((row) => ({
id: String(row._id),
title: row.title,
page: row.page,
dismissCount: row.dismissCount,
})),
feedbackSummary: feedbackSummaryAgg[0] ?? {helpful: 0, notHelpful: 0, withComments: 0},
feedbackComments: comments,
},
});