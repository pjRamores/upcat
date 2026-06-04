.targetType: "user",
.targetId: body.userId,
.metadata: { amount: body.amount, reason: body.reason },
});
return res.status(200).json({ success: true, data: result });
}

// --- Achievements catalog ---
if (resource === "achievements") {
    if (req.method === "GET") {
        const items = await db
            .collection("achievements_catalog")
            .find({})
            .sort({ category: 1, rarity: 1, title: 1 })
            .toArray();
        return res.status(200).json({ success: true, data: items });
    }
    if (req.method === "POST") {
        const seed = String(req.query.seed || "");
        if (seed === "true") {
            const out = await seedAchievementsCatalog(db);
            await logActivity(db, {
                actorId: admin_id,
                actorRole: "admin",
                action: "admin.gamification.seed_achievements",
                targetType: "achievement_catalog",
                metadata: out,
            });
            return res.status(200).json({ success: true, data: out });
        }
        const body = (req.body || {}) as AdminAchievementUpsertPayload;
        if (!body.id) return badRequest(res, "id-is-required");
        if (!ACHIEVEMENT_CATEGORIES.includes(body.category)) return badRequest(res, "invalid-category");
        if (!ACHIEVEMENT_RARITIES.includes(body.rarity)) return badRequest(res, "invalid-rarity");
        if (!body.condition || typeof body.condition.kind !== "string") return badRequest(res, "invalid-condition");
        const now = new Date();
        const update = await db.collection("achievements_catalog").updateOne(
            { id: body.id },
            {
                $set: {
                    id: body.id,
                    category: body.category,
                    rarity: body.rarity,
                    title: body.title,
                    description: body.description,
                    icon: body.icon,
                    xpReward: body.xpReward,
                    points: body.points,
                    condition: body.condition,
                    hidden: !!body.hidden,
                    isActive: body.isActive !== false,
                    updatedAt: now,
                },
                $setOnInsert: { createdAt: now },
            },
            { upsert: true },
        );
        await logActivity(db, {
            actorId: admin_id,
            actorRole: "admin",
            action: "admin.gamification.upsert_achievement",
            targetType: "achievement",
            metadata: { id: body.id, upserted: !!update.upsertedId },
        });
        return res.status(200).json({ success: true });
    }
    if (req.method === "DELETE") {
        const id = String(req.query.id || path.split("/achievements/")[1]?.split("/")[0] || "");
        if (!id) return badRequest(res, "id-required-in-path");
        await db
            .collection("achievements_catalog")
            .updateOne({ id }, { $set: { isActive: false, updatedAt: new Date() } });
        await logActivity(db, {
            actorId: admin_id,
            actorRole: "admin",
            action: "admin.gamification.deactivate_achievement",
            targetType: "achievement",
            metadata: { id },
        });
        return res.status(200).json({ success: true });
    }
}

// --- Weekly challenges catalog ---
if (resource === "challenges") {
    if (req.method === "GET") {
        const items = await db
            .collection("weekly_challenges_catalog")
            .find({})
            .sort({ title: 1 })
            .toArray();
        return res.status(200).json({ success: true, data: items });
    }
    if (req.method === "POST") {
        const body = (req.body || {}) as AdminWeeklyChallengeUpsertPayload;
        if (!body.id) return badRequest(res, "id-is-required");
        if (!body.metric) return badRequest(res, "metric-is-required");
        if (typeof body.target !== "number" || body.target <= 0) return badRequest(res, "target-must-be->0");
        const now = new Date();
        await db.collection("weekly_challenges_catalog").updateOne(
            { id: body.id },
            {
                $set: {
                    id: body.id,
title: body.title,
description: body.description,
metric: body.metric,
target: body.target,
threshold: body.threshold ?? null,
xpReward: body.xpReward,
weight: body.weight ?? 1,
isActive: body.isActive !== false,
updatedAt: now,
},
$setOnInsert: {createdAt: now},
},
{upsert: true},
);
await logActivity(db, {
actorId: admin_id,
actorRole: "admin",
action: "admin.gamification.upsert_challenge",
targetType: "weekly_challenge",
metadata: {id: body.id},
});
return res.status(200).json({success: true});
}

res.setHeader("Allow", "GET, POST, DELETE");
return res.status(405).json({success: false, error: "Method not allowed"});
}