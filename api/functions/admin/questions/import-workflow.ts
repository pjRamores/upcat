import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import { logActivity } from "../../src/activityLog.js";
import { inferDuplicateTier } from "../../src/questionManagement.js";
import { validateQuestionPayload } from "./index.js";

interface ImportBatchRow {
  rowNumber: number;
  status: "valid" | "invalid" | "duplicate_exact" | "duplicate_near";
  error?: string;
  duplicateQuestionId?: ObjectId;
  payload?: Record<string, unknown>;
}

const CSV_HEADERS = [
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
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === "POST" && req.query.action === "preview") {
    return previewImport(req, res, admin._id);
  }
  if (req.method === "POST" && req.query.action === "confirm") {
    return confirmImport(req, res, admin._id);
  }
  if (req.method === "POST" && req.query.action === "undo") {
    return undoImport(req, res, admin._id);
  }
  if (req.method === "GET" && req.query.action === "batch") {
    return getBatch(req, res);
  }

  res.setHeader("Allow", "GET,POST");
  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function previewImport(req: VercelRequest, res: VercelResponse, adminId: ObjectId) {
  try {
    const format = (req.body?.format ?? "json") as "json" | "csv";
    const setId = String(req.body?.setId ?? "").trim();

    if (!setId) {
      return res.status(400).json({ success: false, error: "setId is required" });
    }

    const { rows, passages: passageDocs } = parsePayload(format, req.body?.data);

    const db = await getDb();
    const questions = db.collection("questions");
    const now = new Date();
    const ttlHours = Math.max(1, Number(process.env.QUESTION_IMPORT_BATCH_TTL_HOURS ?? 48));

    const batchRows: ImportBatchRow[] = [];
    const validFingerprintToRows = new Map<string, ImportBatchRow[]>();

    for (let idx = 0; idx < rows.length; idx++) {
      const raw = rows[idx];
      const normalized = normalizeRow(raw);
      const result = validateQuestionPayload(normalized);

      if (!result.ok) {
        batchRows.push({
          rowNumber: idx + 1,
          status: "invalid",
          error: result.error,
        });
        continue;
      }

      const fingerprint = String(result.value.dedupFingerprint);

      const row: ImportBatchRow = {
        rowNumber: idx + 1,
        status: "valid",
        payload: {
          ...result.value,
          setId,
          publicationStatus: "draft",
          isDraft: true,
          version: 1,
        },
      };

      batchRows.push(row);

      const sameFingerprintRows = validFingerprintToRows.get(fingerprint) ?? [];
      sameFingerprintRows.push(row);
      validFingerprintToRows.set(fingerprint, sameFingerprintRows);
    }

    for (const rowsForFingerprint of validFingerprintToRows.values()) {
      if (rowsForFingerprint.length > 1) {
        for (let i = 1; i < rowsForFingerprint.length; i++) {
          rowsForFingerprint[i].status = "duplicate_exact";
        }
      }
    }

    const fingerprints = [...validFingerprintToRows.keys()];
    const existing = fingerprints.length
      ? await questions
          .find(
            {
              dedupFingerprint: { $in: fingerprints },
              isDeleted: { $ne: true },
            },
            {
              projection: {
                _id: 1,
                dedupFingerprint: 1,
                questionText: 1,
                subjectArea: 1,
                subtopic: 1,
              },
            },
          )
          .toArray()
      : [];

    const existingByFingerprint = new Map(
      existing.map((doc) => [String(doc.dedupFingerprint), doc]),
    );

    const nearDuplicateCache = new Map<string, Array<Record<string, unknown>>>();

    for (const [fingerprint, rowsForFingerprint] of validFingerprintToRows.entries()) {
      const duplicateDoc = existingByFingerprint.get(fingerprint);

      for (const row of rowsForFingerprint) {
        if (!row.payload) continue;

        if (row.status === "duplicate_exact") {
          if (duplicateDoc) {
            row.duplicateQuestionId = duplicateDoc._id;
          }
          continue;
        }

        if (duplicateDoc) {
          row.status = "duplicate_exact";
          row.duplicateQuestionId = duplicateDoc._id;
          continue;
        }

        const subjectArea = String(row.payload.subjectArea ?? "");
        const subtopic = String(row.payload.subtopic ?? "");
        const cacheKey = `${subjectArea}::${subtopic}`;

        if (!nearDuplicateCache.has(cacheKey)) {
          const candidates = await questions
            .find(
              {
                subjectArea,
                subtopic,
                isDeleted: { $ne: true },
              },
              {
                projection: {
                  _id: 1,
                  dedupFingerprint: 1,
                  questionText: 1,
                },
              },
            )
            .limit(25)
            .toArray();

          nearDuplicateCache.set(cacheKey, candidates as Array<Record<string, unknown>>);
        }

        const nearDuplicates = nearDuplicateCache.get(cacheKey) ?? [];

        for (const candidate of nearDuplicates) {
          const tier = inferDuplicateTier({
            existingFingerprint: String(candidate.dedupFingerprint ?? ""),
            candidateFingerprint: fingerprint,
            existingQuestionText: String(candidate.questionText ?? ""),
            candidateQuestionText: String(row.payload.questionText ?? ""),
          });

          if (tier === "near") {
            row.status = "duplicate_near";
            if (candidate._id instanceof ObjectId) {
              row.duplicateQuestionId = candidate._id;
            }
            break;
          }
        }
      }
    }

    const validRows = batchRows.filter((r) => r.status === "valid").length;
    const duplicateRows = batchRows.filter(
      (r) => r.status === "duplicate_exact" || r.status === "duplicate_near",
    ).length;
    const invalidRows = batchRows.length - validRows - duplicateRows;

    const batchDoc = {
      status: "previewed" as const,
      format,
      totalRows: batchRows.length,
      validRows,
      duplicateRows,
      invalidRows,
      rows: batchRows,
      passages: passageDocs,
      appliedOps: [] as Array<Record<string, unknown>>,
      createdById: adminId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * ttlHours),
    };

    const insert = await db.collection("question_import_batches").insertOne(batchDoc);

    await logActivity(db, {
      actorId: adminId,
      actorRole: "admin",
      action: "question.import_previewed",
      targetType: "question_import_batch",
      targetId: insert.insertedId,
      metadata: {
        totalRows: batchRows.length,
        validRows,
        duplicateRows,
        invalidRows,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        batchId: insert.insertedId.toString(),
        totalRows: batchRows.length,
        validRows,
        duplicateRows,
        invalidRows,
        passagesDetected: passageDocs.length,
        rows: batchRows.slice(0, 500).map(serializeBatchRow),
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to preview import",
    });
  }
}

async function confirmImport(req: VercelRequest, res: VercelResponse, adminId: ObjectId) {
  const db = await getDb();
  const batchId = String(req.body?.batchId ?? "");
  const setId = String(req.body?.setId ?? "").trim();
  const mode = String(req.body?.mode ?? "skip_duplicates") as
    | "skip_duplicates"
    | "insert_all"
    | "replace_exact";

  if (!setId) {
    return res.status(400).json({ success: false, error: "setId is required" });
  }
  if (!ObjectId.isValid(batchId)) {
    return res.status(400).json({ success: false, error: "Valid batchId is required" });
  }

  const batches = db.collection("question_import_batches");
  const questions = db.collection("questions");
  const oid = new ObjectId(batchId);
  const batch = await batches.findOne({ _id: oid });

  if (!batch) {
    return res.status(404).json({ success: false, error: "Batch not found" });
  }
  if (batch.status !== "previewed") {
    return res.status(409).json({
      success: false,
      error: "Batch has already been finalized",
    });
  }

  const now = new Date();

  const passageDocs = Array.isArray(batch.passages)
    ? (batch.passages as Record<string, unknown>[])
    : [];

  for (const p of passageDocs) {
    if (!p.id || !ObjectId.isValid(String(p.id))) continue;

    const passageOid = new ObjectId(String(p.id));
    await db.collection("passages").updateOne(
      { _id: passageOid },
      {
        $setOnInsert: {
          _id: passageOid,
          title: String(p.title ?? ""),
          content: String(p.content ?? ""),
          source: String(p.source ?? ""),
          subjectArea: String(p.subjectArea ?? ""),
          publicationStatus: "draft",
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
          createdBy: adminId,
        },
      },
      { upsert: true },
    );
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const appliedOps: Array<Record<string, unknown>> = [];

  const rows = Array.isArray(batch.rows) ? (batch.rows as ImportBatchRow[]) : [];

  for (const row of rows) {
    if (!row.payload) {
      skipped += 1;
      continue;
    }

    const isDuplicate = row.status === "duplicate_exact" || row.status === "duplicate_near";

    if (isDuplicate && mode === "skip_duplicates") {
      skipped += 1;
      continue;
    }

    if (row.status === "duplicate_exact" && mode === "replace_exact" && row.duplicateQuestionId) {
      const existing = await questions.findOne({ _id: row.duplicateQuestionId });

      if (!existing) {
        skipped += 1;
        continue;
      }

      const nextVersion = Math.max(1, Number(existing.version ?? 1)) + 1;

      await db.collection("question_versions").insertOne({
        questionId: existing._id,
        version: Number(existing.version ?? 1),
        snapshot: {
          subjectArea: existing.subjectArea,
          subtopic: existing.subtopic,
          difficulty: existing.difficulty,
          type: existing.type,
          questionText: existing.questionText,
          choices: existing.choices,
          correctAnswer: existing.correctAnswer,
          rationale: existing.rationale,
          tags: existing.tags ?? [],
          contentBlocks: existing.contentBlocks ?? [],
          setId: existing.setId,
          isDraft: existing.isDraft,
          publicationStatus: existing.publicationStatus,
        },
        editedBy: adminId,
        updatedAt: now,
        note: "Bulk import replace_exact",
      });

      await questions.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...row.payload,
            setId,
            version: nextVersion,
            updatedAt: now,
            isDraft: true,
            publicationStatus: "draft",
          },
        },
      );

      updated += 1;
      appliedOps.push({
        type: "update",
        questionId: existing._id,
        previous: {
          subjectArea: existing.subjectArea,
          subtopic: existing.subtopic,
          difficulty: existing.difficulty,
          type: existing.type,
          questionText: existing.questionText,
          choices: existing.choices,
          correctAnswer: existing.correctAnswer,
          rationale: existing.rationale,
          tags: existing.tags ?? [],
          contentBlocks: existing.contentBlocks ?? [],
          setId: existing.setId,
          version: existing.version,
          updatedAt: existing.updatedAt,
          isDraft: existing.isDraft,
          publicationStatus: existing.publicationStatus,
        },
      });
      continue;
    }

    const insertResult = await questions.insertOne({
      ...row.payload,
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
      createdBy: adminId,
    });

    inserted += 1;
    appliedOps.push({ type: "insert", questionId: insertResult.insertedId });
  }

  await batches.updateOne(
    { _id: oid },
    {
      $set: {
        status: "confirmed",
        mode,
        inserted,
        updated,
        skipped,
        appliedOps,
        confirmedAt: now,
        updatedAt: now,
      },
    },
  );

  await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question.import_confirmed",
    targetType: "question_import_batch",
    targetId: oid,
    metadata: { inserted, updated, skipped, mode },
  });

  return res.status(200).json({
    success: true,
    data: { inserted, updated, skipped, mode },
  });
}

async function undoImport(req: VercelRequest, res: VercelResponse, adminId: ObjectId) {
  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid batch id" });
  }

  const db = await getDb();
  const batches = db.collection("question_import_batches");
  const questions = db.collection("questions");
  const oid = new ObjectId(id);
  const batch = await batches.findOne({ _id: oid });

  if (!batch) {
    return res.status(404).json({ success: false, error: "Batch not found" });
  }
  if (batch.status !== "confirmed") {
    return res.status(409).json({
      success: false,
      error: "Only confirmed batches can be undone",
    });
  }

  let revertedInserts = 0;
  let revertedUpdates = 0;

  for (const op of (batch.appliedOps ?? []) as Array<Record<string, unknown>>) {
    if (op.type === "insert" && op.questionId && ObjectId.isValid(String(op.questionId))) {
      const result = await questions.deleteOne({
        _id: new ObjectId(String(op.questionId)),
      });
      revertedInserts += result.deletedCount;
      continue;
    }

    if (op.type === "update" && op.questionId && op.previous && ObjectId.isValid(String(op.questionId))) {
      const previous = op.previous as Record<string, unknown>;
      await questions.updateOne(
        { _id: new ObjectId(String(op.questionId)) },
        { $set: { ...previous, updatedAt: new Date() } },
      );
      revertedUpdates += 1;
    }
  }

  const now = new Date();
  await batches.updateOne(
    { _id: oid },
    {
      $set: {
        status: "undone",
        undoneAt: now,
        undoneBy: adminId,
        updatedAt: now,
      },
    },
  );

  await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question.import_undone",
    targetType: "question_import_batch",
    targetId: oid,
    metadata: { revertedInserts, revertedUpdates },
  });

  return res.status(200).json({
    success: true,
    data: { revertedInserts, revertedUpdates },
  });
}

async function getBatch(req: VercelRequest, res: VercelResponse) {
  const id = String(req.query.id ?? "");
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, error: "Invalid batch id" });
  }

  const db = await getDb();
  const batch = await db.collection("question_import_batches").findOne({
    _id: new ObjectId(id),
  });

  if (!batch) {
    return res.status(404).json({ success: false, error: "Batch not found" });
  }

  return res.status(200).json({
    success: true,
    data: {
      ...batch,
      _id: batch._id.toString(),
      createdById: batch.createdById?.toString?.() ?? null,
      rows: Array.isArray(batch.rows)
        ? (batch.rows as ImportBatchRow[]).slice(0, 1000).map(serializeBatchRow)
        : [],
    },
  });
}

function serializeBatchRow(row: ImportBatchRow) {
  return {
    ...row,
    duplicateQuestionId: row.duplicateQuestionId?.toString(),
  };
}

function parsePayload(
  format: "json" | "csv",
  rawData: unknown,
): { rows: Record<string, unknown>[]; passages: Record<string, unknown>[] } {
  if (format === "json") {
    if (
      rawData &&
      typeof rawData === "object" &&
      !Array.isArray(rawData) &&
      "questions" in (rawData as object)
    ) {
      const compound = rawData as { passages?: unknown[]; questions?: unknown[] };
      const passages = Array.isArray(compound.passages)
        ? (compound.passages as Record<string, unknown>[])
        : [];
      const rows = Array.isArray(compound.questions)
        ? (compound.questions as Record<string, unknown>[])
        : [];
      return { rows, passages };
    }

    if (!Array.isArray(rawData)) {
      throw new Error(
        "JSON import data must be an array or { passages: [...], questions: [...] }",
      );
    }

    return { rows: rawData as Record<string, unknown>[], passages: [] };
  }

  return { rows: parseCsv(String(rawData ?? "")), passages: [] };
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const raw = { ...row };

  if (raw.choices !== null && typeof raw.choices === "object" && !Array.isArray(raw.choices)) {
    const c = raw.choices as Record<string, unknown>;
    const choices = (["A", "B", "C", "D"] as const)
      .filter((k) => c[k] !== undefined)
      .map((k) => ({ text: String(c[k] ?? "") }));

    const tags =
      typeof raw.tags === "string"
        ? String(raw.tags)
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : Array.isArray(raw.tags)
          ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
          : [];

    return { ...raw, choices, tags };
  }

  if (Array.isArray(raw.choices)) {
    const tags =
      typeof raw.tags === "string"
        ? String(raw.tags)
            .split(/[,\s]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : Array.isArray(raw.tags)
          ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
          : [];

    return { ...raw, tags };
  }

  const choiceKeys = [
    "choiceA",
    "choiceB",
    "choiceC",
    "choiceD",
    "ChoiceA",
    "ChoiceB",
    "ChoiceC",
    "ChoiceD",
  ];

  const lowerCaseKeysPresent = ["choiceA", "choiceB", "choiceC", "choiceD"].some(
    (k) => raw[k] !== undefined,
  );
  const keysToUse = lowerCaseKeysPresent
    ? ["choiceA", "choiceB", "choiceC", "choiceD"]
    : ["ChoiceA", "ChoiceB", "ChoiceC", "ChoiceD"];

  const choices: { text: string }[] = [];
  for (const k of keysToUse) {
    if (raw[k] !== undefined) {
      choices.push({ text: String(raw[k] ?? "") });
    }
  }

  const tags =
    typeof raw.tags === "string"
      ? String(raw.tags)
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : Array.isArray(raw.tags)
        ? raw.tags.map((t) => String(t).trim()).filter(Boolean)
        : [];

  const normalized: Record<string, unknown> = {
    ...raw,
    tags,
  };

  if (choices.length > 0) {
    normalized.choices = choices;
  }

  for (const key of choiceKeys) {
    delete normalized[key];
  }

  return normalized;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const rowsRaw = parseCsvRows(text);
  if (rowsRaw.length < 2) return [];

  const headers = rowsRaw.map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < rowsRaw.length; i++) {
    const cells = rowsRaw[i];
    const row: Record<string, unknown> = {};

    headers.forEach((h, idx) => {
      if (CSV_HEADERS.includes(h as (typeof CSV_HEADERS)[number]) || h.length > 0) {
        row[h] = cells[idx] ?? "";
      }
    });

    rows.push(row);
  }

  return rows;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];

    if (inQuotes) {
      if (ch === '"' && normalized[i + 1] === '"') {
        currentCell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (ch === "\n") {
      currentRow.push(currentCell);
      const isNonEmptyRow = currentRow.some((cell) => cell.length > 0);
      if (isNonEmptyRow) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += ch;
  }

  currentRow.push(currentCell);
  const isNonEmptyRow = currentRow.some((cell) => cell.length > 0);
  if (isNonEmptyRow) {
    rows.push(currentRow);
  }

  return rows;
}
