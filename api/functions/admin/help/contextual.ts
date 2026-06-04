import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../../src/auth.js";
import {getDb} from "../../src/db.js";

type StringIdDoc = {_id: string; [key: string]: unknown};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;

    const db = await getDb();
    const contextualHelp = db.collection<StringIdDoc>("contextual_help");

    if (req.method === "GET") {
        const items = await contextualHelp
            .find({})
            .sort({page: 1, order: 1, _id: 1})
            .toArray();
        return res.status(200).json({success: true, data: {items}});
    }

    if (req.method === "POST") {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const id = String(body.id ?? "").trim();
        if (!id) {
            return res.status(400).json({success: false, error: "id is required"});
        }

        const exists = await contextualHelp.findOne({_id: id});
        if (exists) {
            return res.status(409).json({success: false, error: "Contextual help id already exists"});
        }

        const now = new Date();
        await contextualHelp.insertOne({
            _id: id,
            page: String(body.page ?? ""),
            elementRef: String(body.elementRef ?? ""),
            type: body.type ?? "tooltip",
            title: String(body.title ?? ""),
            shortDescription: String(body.shortDescription ?? ""),
            detailedContent: body.detailedContent ?? null,
            helpArticleSlug: body.helpArticleSlug ?? null,
            helpArticleSection: body.helpArticleSection ?? null,
            showForNewUsers: body.showForNewUsers !== false,
            showIcon: body.showIcon !== false,
            triggerOnHover: body.triggerOnHover === true,
            dismissable: body.dismissable !== false,
            isActive: body.isActive !== false,
            order: Number(body.order ?? 100),
            createdAt: now,
            updatedAt: now,
            updatedBy: admin._id,
        });

        return res.status(201).json({success: true, data: {created: true, id}});
    }

    if (req.method === "PUT") {
        const id = String(req.query.id ?? "").trim();
        if (!id) {
            return res.status(400).json({success: false, error: "Missing contextual help id"});
        }

        const patch: Record<string, unknown> = {
            ...(req.body as Record<string, unknown>),
            updatedAt: new Date(),
            updatedBy: admin._id,
        };
        delete patch._id;

        const result = await contextualHelp.updateOne({_id: id}, {$set: patch});
        if (!result.matchedCount) {
            return res.status(404).json({success: false, error: "Contextual help not found"});
        }
        return res.status(200).json({success: true, data: {updated: true}});
    }

    res.setHeader("Allow", "GET, POST, PUT");
    return res.status(405).json({success: false, error: "Method not allowed"});
}