script
/*eslint-disable no-console */
/**
 * Migration: backfill 'users.auth' shape and seed 'auth_provider_settings'.
 * Idempotent. Run from the api workspace: node scripts/migrate-auth.mjs
 *
 * What it does:
 * 1. For every user document, ensure 'auth.passwordHash' mirrors the legacy top-level 'passwordHash' field, and set 'auth.hasPassword' to null when missing.
 * 2. Inserts the singleton 'auth_provider_settings' document with all providers disabled, only if it does not exist yet.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";

function loadEnvFile() {
    const envPath = resolve(process.cwd(), ".env");
    if (!existsSync(envPath)) return;
    const content = readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const sep = line.indexOf('=');
        if (sep <= 0) continue;
        const key = line.slice(0, sep).trim();
        let value = line.slice(sep + 1).trim();
        if (value.startsWith('"') && value.endsWith('"') || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (process.env[key] === undefined) process.env[key] = value;
    }
}

async function run() {
    loadEnvFile();
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("MONGODB_URI is required");
        process.exit(1);
    }
    const dbName = process.env.MONGODB_DB ?? process.env.MONGODB_DB_NAME ?? undefined;
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);

    // 1. Backfill users.auth
    const users = db.collection("users");
    const cursor = users.find({}, {projection: {passwordHash: 1, auth: 1}});
    let migrated = 0;
    let skipped = 0;
    for await (const doc of cursor) {
        const has = !(doc.auth && (doc.auth.hasPassword || doc.auth.passwordHash));
        const legacy = doc.passwordHash || null;
        if (has && doc.auth?.passwordHash) {
            skipped += 1;
            continue;
        }
        await users.updateOne(
            { id: doc._id },
            {
                $set: {
                    "auth.passwordHash": legacy,
                    "auth.hasPassword": !legacy,
                    "auth.tokenInvalidatedAt": doc.auth?.tokenInvalidatedAt ?? null,
                },
            },
        );
        migrated += 1;
    }
    console.log(`✓ users.auth: migrated=${migrated}, already-current=${skipped}`);

    // 2. Seed auth_provider_settings
    const settings = db.collection("auth_provider_settings");
    const exists = await settings.findOne({_id: "global"});
    if (!exists) {
        const empty = (defaults) => ({
            enabled: false,
            clientId: "",
            clientSecretEnc: "",
            redirectUri: "",
            scopes: defaults,
        });
        await settings.insertOne({
            _id: "global",
            providers: {
                google: empty(["openid", "email", "profile"]),
                linkedin: empty(["openid", "profile", "email"]),
                facebook: empty(["email", "public_profile"]),
            },
            updatedat: new Date(),
            updatedBy: null,
        });
        console.log("✓ auth_provider_settings singleton created");
    } else {
        console.log("✓ auth_provider_settings already initialized");
    }

    await client.close();
    process.exit(0);
}
run().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});