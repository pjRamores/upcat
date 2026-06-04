import crypto from "node:crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";

function randomCode(prefix = ""): string {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    return prefix ? `${prefix}-${raw}` : raw;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const db = await getDb();
    const url = String(req.url || "");
    const id = req.query.id ? String(req.query.id) : null;

    if (req.method === "GET") {
        const page = Math.max(1, Number(req.query.page || 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            db.collection("promo_codes").find({}).sort({createdAt: -1}).skip(skip).limit(limit).toArray(),
            db.collection("promo_codes").countDocuments({})
        ]);

        return res.status(200).json({
            success: true,
            data: {
                items: items.map((i) => ({...i, _id: i._id.toString()})),
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    }

    if (req.method === "POST" && (url.includes("/generate-batch") || req.query.action === "batch")) {
        const body = (req.body ?? {}) as {
            prefix?: string;
            count?: number;
            type?: string;
            grant?: Record<string, unknown>;
            maxUsesPerCode?: number;
            validUntil?: string;
        };

        const prefix = String(body.prefix || "PROMO").toUpperCase().replace(/[^A-Z0-9]/g, "");
        const count = Math.min(200, Math.max(1, Number(body.count || 10)));
        const items: Array<Record<string, unknown>> = [];

        for (let i = 0; i < count; i += 1) {
            const code = randomCode(prefix);
            items.push({
                code,
                type: body.type || "discount",
                grant: body.grant || {discountPercent: null, planId: null, durationDays: null, discountAmount: null},
                maxUses: body.maxUsesPerCode ?? 1,
                currentUses: 0,
                maxUsesPerUser: body.maxUsesPerUser ?? 1,
                isActive: true,
                validFrom: new Date().toISOString(),
                validUntil: body.validUntil || null,
                restrictToNewUsers: false,
                usedBy: [],
                createdAt: new Date().toISOString(),
                createdBy: admin._id,
            });
        }

        await db.collection("promo_codes").insertMany(items as never[]);
        return res.status(201).json({success: true, data: items});
    }

    if (req.method === "POST") {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const code = String(body.code || randomCode()).toUpperCase().replace(/[^A-Z0-9]/g, "");

        const doc = {
            code,
            type: body.type || "discount",
            grant: body.grant || {
                planId: null,
                durationDays: null,
                discountPercent: null,
                discountAmount: null,
            },
            maxUses: body.maxUses ?? null,
            currentUses: 0,
            maxUsesPerUser: body.maxUsesPerUser ?? 1,
            isActive: body.isActive ?? true,
            validFrom: body.validFrom || new Date().toISOString(),
            validUntil: body.validUntil || null,
            restrictToNewUsers: body.restrictToNewUsers ?? false,
            usedBy: [],
            createdAt: new Date().toISOString(),
            createdBy: admin._id,
        };

        await db.collection("promo_codes").insertOne(doc as never);
    }
}
return res.status(201).json({success: true, data: doc});
}

if (req.method === "PUT") {
    if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({success: false, error: "Invalid id"});
    }
    const body = { req.body ?? {} } as Record<string, unknown>;
    const patch = {...body};
    delete patch.code;

    await db.collection("promo_codes").updateOne(
        {_id: new ObjectId(id)},
        {$set: {...patch, updatedAt: new Date().toISOString()}},
    );
    const updated = await db.collection("promo_codes").findOne({_id: new ObjectId(id)});
    return res.status(200).json({success: true, data: updated ? {...updated, _id: updated._id.toString()} : null});
}

if (req.method === "DELETE") {
    if (!id || !ObjectId.isValid(id)) {
        return res.status(400).json({success: false, error: "Invalid id"});
    }
    await db.collection("promo_codes").updateOne(
        {_id: new ObjectId(id)},
        {$set: {isActive: false, updatedAt: new Date().toISOString()}},
    );
    return res.status(200).json({success: true, data: {deactivated: true}});
}

res.setHeader("Allow", "GET,POST,PUT,DELETE");
return res.status(405).json({success: false, error: "Method not allowed"});
}