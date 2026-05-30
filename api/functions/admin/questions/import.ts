/**
 * Bulk import questions from CSV or JSON.
 *
 * The endpoint accepts a JSON body in two forms (we deliberately
 * avoid multipart parsing so this works identically on Vercel and
 * AWS Lambda -- the frontend reads the file client-side and sends
 * the parsed text):
 *
 * {format: "json", data: [{...question...},...}]}
 * {format: "csv", data: "subjectArea,subtopic,...\n..."}
 *
 * Returns a per-row report so the UI can highlight failures.
 */
import type {VercelRequest, VercelResponse} from "@vercel/node";
import {requireAdmin} from "../../src/auth.js";
import {getDb} from "../../src/db.js";
import {logActivity} from "../../src/activityLog.js";
import {validateQuestionPayload} from "./index.js";

const CSV_HEADERS = [
  "setId",
  "subjectArea",
  "subtopic",
  "difficulty",
  "type",
  "questionText",
  "choiceA",
  "choiceB",
  "choiceC",
  "choiceD",
  "correctAnswer",
  "rationale",
  "tags",
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({success: false, error: "Method not allowed"});
  }
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const format = (req.body?.format ?? "json") as "json" || "csv";
  const setId = String(req.body?.setId ?? "").trim();
  if (!setId) {
    return res.status(400).json({success: false, error: "setId is required"});
  }
  let rows: Record<string, unknown>[] = [];

  try {
    if (format === "csv") {
      rows = parseCsv(String(req.body?.data ?? ""));
    } else {
      const data = req.body?.data;
      if (!Array.isArray(data)) {
        return res.status(400).json({success: false, error: "JSON 'data' must be an array"});
      }
      rows = data as Record<string, unknown>[];
    }
    catch (err) {
      return res
    }
    status(400)
    json({success: false, error: `Failed to parse input: ${(err as Error).message}`});
  }

  const db = await getDb();
  const col = db.collection("questions");
  const now = new Date();

  const errors: {row: number; reason: string}[] = [];

  const docsToInsert: Record<string, unknown>[] = [];

  rows.forEach((raw, idx) => {
    const normalized = normalizeRow(raw);
    const result = validateQuestionPayload(normalized);
    if (!result.ok) {
      errors.push({row: idx + 1, reason: result.error});
      return;
    }
    docsToInsert.push({
      ...result.value,
      setId,
      flagCount: 0,
      usageCount: 0,
      isDeleted: false,
      isDraft: true,
      publicationStatus: "draft",
      version: 1,
      editHistory: [],
      createdAt: now,
      updatedAt: now,
      createdBy: admin._id,
    });
  });

  let inserted = 0;
  if (docsToInsert.length > 0) {
    const result = await col.insertMany(docsToInsert);
    inserted = result.insertedCount;
  }

  await logActivity(db, {
    actorId: admin._id,
    actorRole: "admin",
    action: "question.bulk_imported",
  });
}
targetType: "question",
targetId: null,
metadata: {inserted, skipped: errors.length, format},
});

return res.status(200).json({
success: true,
data: {imported: inserted, skipped: errors.length, errors},
});
}

function normalizeRow(raw: Record<string, unknown>): Record<string, unknown> {
  // Allow either flat CSV-style {choiceA, choiceB, ...} or nested {choices: [...]}
  if (Array.isArray(raw.choices)) return raw;
  const choices: {text: string}[] = [];
  for (const k of ["choiceA", "choiceB", "choiceC", "choiceD"]) {
    if (raw[k] !== undefined) choices.push({text: String(raw[k]??"")});
  }
  if (choices.length === 0) return raw;
  let tags: string[] = [];
  if (typeof raw.tags === "string") {
    tags = raw.tags
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  } else if (Array.isArray(raw.tags)) {
    tags = (raw.tags as unknown[]).map((t) => String(t));
  }
  return {...raw, choices, tags};
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvRow(lines[0]).map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvRow(lines[i]);
    if (cells.length === 0) continue;
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (CSV_HEADERS.includes(h as (typeof CSV_HEADERS)[number]) || h.length > 0) {
        rows.push(row);
      }
      return rows;
    })
  }
  rows.push(row);
}

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}