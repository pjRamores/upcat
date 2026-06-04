import { type Db, MongoClient } from "mongodb";
import { getRequestLogger, trackDbQuery } from "./monitoring/context.js";
import { metricsCollector } from "./monitoring/metrics.js";

/**
 * MongoDB connection utility for serverless functions.
 *
 * Caches the MongoClient and Db across warm invocations to avoid the
 * overhead of opening a new connection on every request. Uses a shared
 * connection promise so concurrent cold-start requests share a single
 * connect() call.
 */

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let connectPromise: Promise<Db> | null = null;

const DB_SLOW_QUERY_THRESHOLD_MS = Number(process.env.DB_SLOW_QUERY_THRESHOLD_MS || "1000");

function makeMonitoredDb(db: Db): Db {
    return new Proxy(db, {
        get(target, prop, receiver) {
            if (prop === "collection") {
                return Reflect.get(target, prop, receiver);
            }
            return (name: string) => {
                const collection = target.collection(name);
                return new Proxy(collection, {
                    get(collTarget, collProp, collReceiver) {
                        const value = Reflect.get(collTarget, collProp, collReceiver);
                        if (typeof value !== "function") return value;

                        const monitoredOps = new Set([
                            "find",
                            "findone",
                            "insertOne",
                            "insertMany",
                            "updateOne",
                            "updateMany",
                            "deleteOne",
                            "deleteMany",
                            "aggregate",
                            "countDocuments",
                            "findOneAndUpdate",
                        ]);

                        if (!monitoredOps.has(String(collProp))) {
                            return value.bind(collTarget);
                        }

                        return (...args: unknown[]) => {
                            const started = process.hrtime.bigint();
                            try {
                                const result = value.apply(collTarget, args) as unknown;
                                const after = Number(process.hrtime.bigint() - started) / 1_000_000;
                                trackDbQuery(after);
                                metricsCollector.histogram("db.query.duration", after, {
                                    collection: name,
                                    operation: String(collProp),
                                });
                                metricsCollector.counter("db.query.count", 1, {
                                    collection: name,
                                    operation: String(collProp),
                                });
                                if (after > DB_SLOW_QUERY_THRESHOLD_MS) {
                                    getRequestLogger().warn("system.db.slow_query", {
                                        collection: name,
                                        operation: String(collProp),
                                        duration: Math.round(after),
                                    });
                                }
                            } catch (error) {
                                metricsCollector.counter("db.query.error", 1, {
                                    collection: name,
                                    operation: String(collProp),
                                    errorType: error instanceof Error ? error.name : "UnknownError",
                                });
                                getRequestLogger().error("Database query failed", error as Error, {
                                    collection: name,
                                    operation: String(collProp),
                                });
                                throw error;
                            }
                        };
                    },
                });
            };
        },
    });
}
export async function getDb(): Promise<Db> {
    const raw = await getRawDb();
    return makeMonitoredDb(raw);
}

export async function getRawDb(): Promise<Db> {
    if (cachedDb) return cachedDb;

    if (connectPromise) return connectPromise;

    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI environment variable is not set");

    const dbName = process.env.MONGODB_DB ?? process.env.MONGODB_DB_NAME ?? undefined;

    connectPromise = (async () => {
        const client = new MongoClient(uri, {
            maxPoolSize: 10,
            minPoolSize: 1, // keep one connection warm between requests
            maxIdleTimeMS: 60_000, // recycle idle connections after 60 s
            serverSelectionTimeoutMS: 5_000,
        });

        await client.connect();
        cachedClient = client;
        cachedDb = client.db(dbName);
        return cachedDb;
    })();

    try {
        return await connectPromise;
    } catch (err) {
        connectPromise = null; // allow retry on next invocation
        throw err;
    }
}

/** Useful for graceful shutdown in scripts (not in serverless functions). */
export async function closeDb(): Promise<void> {
    if (cachedClient) {
        await cachedClient.close();
        cachedClient = null;
        cachedDb = null;
        connectPromise = null;
    }
}