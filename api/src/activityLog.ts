/**
 * Activity log helper. Persists structured records to the
 * 'activity_log' collection. All admin actions and important
 * reviewee events flow through here so the dashboard can
 * render a chronological feed.
 */
import { type Db, ObjectId } from "mongodb";
import type { UserRole } from "@upcat/shared";

export interface LogActivityArgs {
    actorId: ObjectId | string | null;
    actorRole: UserRole | "system";
    action: string;
    targetType: string;
    targetId?: ObjectId | string | null;
    metadata?: Record<string, unknown>;
}

function asOid(value: ObjectId | string | null | undefined): ObjectId | null {
    if (!value) return null;
    if (value instanceof ObjectId) return value;
    return ObjectId.isValid(value) ? new ObjectId(value) : null;
}

export async function logActivity(db: Db, args: LogActivityArgs): Promise<void> {
    try {
        await db.collection("activity_log").insertOne({
            actorId: asOid(args.actorId ?? null),
            actorRole: args.actorRole,
            action: args.action,
            targetType: args.targetType,
            targetId: asOid(args.targetId ?? null),
            metadata: args.metadata ?? {},
            createdAt: new Date(),
        });
    } catch (err) {
        // Logging must never break the request flow.
        // eslint-disable-next-line no-console
        console.error("[activity_log] insert failed", err);
    }
}