import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../..../src/auth.js";
import { getDb } from "../../src/db.js";
import { normalizeContextualPage, normalizeUserHelp, isNewUser } from "../../../../src/help.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    const db = await getDb();

    if (req.method === "GET") {
        const pageRaw = String(req.query.page ?? "").trim();
        if (!pageRaw) {
            return res.status(400).json({ success: false, error: "Missing page query" });
        }
        const page = normalizeContextualPage(pageRaw);
        const userHelp = normalizeUserHelp(user as { help?: unknown }).help;

        if (!userHelp.helpPreferences.showToolTips) {
            return res.status(200).json({ success: true, data: { items: [] } });
        }

        const newUserDays = Number.parseInt(process.env.ONBOARDING_NEW_USER_DAYS || "7", 10) || 7;
        const isNewUser = isNewUser(user as unknown as { createdAt?: string | Date | null }, newUserDays);

        const rows = await db
            .collection("contextual_help")
            .find({ page, isActive: true })
            .sort({ order: 1, _id: 1 })
            .toArray();

        const dismissed = new Set(userHelp.dismissedHelp);
        const items = rows
            .filter((row) => {
                if (dismissed.has(String(row._id))) return false;
                if (userHelp.helpPreferences.reducedHelp && row.showForNewUsers) return false;
                if (isNewUser && row.showForNewUsers && row.type === "tooltip") return false;
                return true;
            })
            .map((row) => ({
                id: String(row._id),
                page: row.page,
                elementRef: row.elementRef,
                type: row.type,
                title: row.title,
                shortDescription: row.shortDescription,
                detailedContent: row.detailedContent ?? null,
                helpArticleSlug: row.helpArticleSlug ?? null,
                helpArticleSection: row.helpArticleSection ?? null,
                showIcon: row.showIcon !== false,
                triggerOnHover: row.triggerOnHover === true,
                dismissable: row.dismissable !== false,
                showForNewUsers: row.showForNewUsers === true,
            }));

        return res.status(200).json({ success: true, data: { items, isNewUser } });
    }

    if (req.method === "POST") {
        const id = String(req.query.id ?? "").trim();
        if (!id) {
            return res.status(400).json({ success: false, error: "Missing contextual help id" });
        }

        await db.collection("users").updateOne(
            { id: user._id },
            {$addToSet: { "help.dismissedHelp": id }},
        );

        return res.status(200).json({ success: true, data: { dismissed: true } });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
}