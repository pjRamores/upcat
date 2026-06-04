import type {Db} from "mongodb";
import {getDb} from "../db.js";
import {getMonitoringConfig} from "./config.js";
import type {MetricDocument, MetricType} from "./types.js";

interface MetricInput {
    name: string;
    type: MetricType;
    value: number;
    dimensions?: Record<string, string | number | boolean | null | undefined>;
    timestamp?: Date;
}

function toBucket(ts: Date): string {
    const d = new Date(ts);
    d.setUTCSeconds(0, 0);
    const m = d.getUTCMinutes();
    d.setUTCMinutes(m - (m % 5));
    return d.toISOString().slice(0, 16);
}

function dims(input: MetricInput["dimensions"]): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(input ?? {})) {
        out[k] = v === undefined ? null : v === null ? null : String(v);
    }
    return out;
}

function percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx] ?? sorted[sorted.length - 1] ?? 0;
}

function histogramSummary(values: number[]) {
    if (!values.length) {
        return {
            count: 0,
            sum: 0,
            min: 0,
            max: 0,
            p50: 0,
            p90: 0,
            p95: 0,
            p99: 0,
            buckets: [],
        };
    }
    const sum = values.reduce((acc, value) => acc + value, 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const boundaries = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    const buckets = boundaries.map((le) => ({
        le,
        count: values.filter((value) => value <= le).length,
    }));
    return {
        count: values.length,
        sum,
        min,
        max,
        p50: percentile(values, 50),
        p90: percentile(values, 90),
        p95: percentile(values, 95),
        p99: percentile(values, 99),
        buckets,
    };
}

export class MetricsCollector {
    private buffer: MetricInput[] = [];
    private timer: NodeJS.Timeout | null = null;
    private flushInFlight = false;

    constructor() {
        this.start();
    }

    start() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            void this.flush();
        }, 10_000);
        this.timer.unref?.();
    }

    counter(name: string, value = 1, dimensions: MetricInput["dimensions"] = {}) {
        this.buffer.push({name, type: "counter", value, dimensions, timestamp: new Date()});
    }

    gauge(name: string, value: number, dimensions: MetricInput["dimensions"] = {}) {
        this.buffer.push({name, type: "gauge", value, dimensions, timestamp: new Date()});
    }

    histogram(name: string, value: number, dimensions: MetricInput["dimensions"] = {}) {
        this.buffer.push({name, type: "histogram", value, dimensions, timestamp: new Date()});
    }

    timerMetric(name: string, dimensions: MetricInput["dimensions"] = {}) {
        const started = process.hrtime.bigint();
        return () => {
            const duration = Number(process.hrtime.bigint() - started) / 1_000_000;

this.histogram(name, duration, dimensions);
return duration;
}

async flush(db?: Db): Promise<void> {
if (this.flushInFlight || this.buffer.length === 0) return;
this.flushInFlight = true;
const batch = this.buffer.splice(0, this.buffer.length);
try {
const cfg = await getMonitoringConfig(db);
if (!cfg.metrics.enabled) return;
const docs = this.aggregate(batch);
if (!docs.length) return;
const targetDb = db ?? (await getRawDb());
await targetDb.collection<MetricDocument>("metrics").insertMany(docs, { ordered: false });
} catch {
// Non-fatal by design.
} finally {
this.flushInFlight = false;
}
}

private aggregate(entries: MetricInput[]): MetricDocument[] {
const grouped = new Map<string, MetricInput[]>();
for (const entry of entries) {
const ts = entry.timestamp ?? new Date();
const key = [entry.name, entry.type, toBucket(ts), JSON.stringify(entry.dimensions)].join("|");
const list = grouped.get(key) ?? [];
list.push({ ...entry, timestamp: ts });
grouped.set(key, list);
}

const docs: MetricDocument[] = [];
for (const [, list] of grouped) {
const first = list[0];
if (!first) continue;
const time = first.timestamp ?? new Date();
const values = list.map((item) => item.value);
const normalizedDims = dims(first.dimensions);

if (first.type === "counter") {
docs.push({
name: first.name,
type: "counter",
value: values.reduce((a, b) => a + b, 0),
dimensions: normalizedDims,
timestamp: time,
bucket: toBucket(time),
histogram: null,
});
continue;
}

if (first.type === "gauge") {
docs.push({
name: first.name,
type: "gauge",
value: values[values.length - 1] ?? 0,
dimensions: normalizedDims,
timestamp: time,
bucket: toBucket(time),
histogram: null,
});
continue;
}

const hist = histogramSummary(values);
docs.push({
name: first.name,
type: first.type,
value: hist.sum,
dimensions: normalizedDims,
timestamp: time,
bucket: toBucket(time),
histogram: hist,
});
}
return docs;
}
}

export const metricsCollector = new MetricsCollector();