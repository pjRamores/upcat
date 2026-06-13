import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../src/auth.js";
import { getDb } from "../../src/db.js";

type Choice = {
  text?: string;
};

type QuestionDoc = {
  _id: { toString(): string };
  subjectArea?: string;
  subtopic?: string;
  difficulty?: string;
  type?: string;
  passageId?: { toString(): string } | null;
  questionText?: string;
  choices?: Choice[];
  correctAnswer?: string;
  rationale?: string;
  tags?: string[];
  publicationStatus?: string;
  version?: number;
  dedupFingerprint?: string;
  contentBlocks?: unknown[];
  mediaAssetIds?: { toString(): string }[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type PassageDoc = {
  _id: { toString(): string };
  title?: string;
  subjectArea?: string;
  source?: string;
  content?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const format = String(req.query.format ?? "json");
  const status = String(req.query.status ?? "any");
  const includeDeleted = req.query.includeDeleted === "true";
  const search = String(req.query.search ?? "").trim();
  const setId = String(req.query.setId ?? "").trim();
  const subjectArea = String(req.query.subjectArea ?? "").trim();
  const subtopic = String(req.query.subtopic ?? "").trim();
  const topic = String(req.query.topic ?? "").trim();
  const difficulty = String(req.query.difficulty ?? "").trim();
  const type = String(req.query.type ?? "").trim();

  const safeSetRef = setId ? setId.replace(/[^a-zA-Z0-9_]/g, "_") : "no-set";
  const exportFilenameBase = `questions-export-set-${safeSetRef}-${Date.now()}`;

  const db = await getDb();
  const filter: Record<string, unknown> = {};

  if (!includeDeleted) filter.isDeleted = { $ne: true };
  if (status !== "any") filter.publicationStatus = status;
  if (search) filter.questionText = { $regex: escapeRegex(search), $options: "i" };
  if (setId) filter.setId = setId;
  if (subjectArea) filter.subjectArea = subjectArea;
  if (subtopic) filter.subtopic = subtopic;
  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;

  if (topic) {
    const tags = topic
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (tags.length > 0) filter.tags = { $in: tags };
  }

  const questions = (await db
    .collection("questions")
    .find(filter)
    .project({
      subjectArea: 1,
      subtopic: 1,
      difficulty: 1,
      type: 1,
      passageId: 1,
      questionText: 1,
      choices: 1,
      correctAnswer: 1,
      rationale: 1,
      tags: 1,
      publicationStatus: 1,
      version: 1,
      dedupFingerprint: 1,
      contentBlocks: 1,
      mediaAssetIds: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ updatedAt: -1 })
    .toArray()) as QuestionDoc[];

  if (format === "csv") {
    const header = [
      "id",
      "subjectArea",
      "subtopic",
      "difficulty",
      "type",
      "passageId",
      "questionText",
      "choiceA",
      "choiceB",
      "choiceC",
      "choiceD",
      "correctAnswer",
      "rationale",
      "tags",
      "publicationStatus",
      "version",
      "dedupFingerprint",
      "hasRichContent",
      "mediaAssetIds",
      "createdAt",
      "updatedAt",
    ];

    const lines = [header.join(",")];

    for (const q of questions) {
      const choices = Array.isArray(q.choices) ? q.choices : [];
      const row = [
        safeCsv(q._id.toString()),
        safeCsv(q.subjectArea),
        safeCsv(q.subtopic),
        safeCsv(q.difficulty),
        safeCsv(q.type),
        safeCsv(q.passageId ? q.passageId.toString() : ""),
        safeCsv(q.questionText),
        safeCsv(choices?.text ?? ""),
        safeCsv(choices?.text ?? ""),
        safeCsv(choices?.text ?? ""),
        safeCsv(choices?.text ?? ""),
        safeCsv(q.correctAnswer),
        safeCsv(q.rationale),
        safeCsv(Array.isArray(q.tags) ? q.tags.join(";") : ""),
        safeCsv(q.publicationStatus ?? "draft"),
        safeCsv(String(q.version ?? 1)),
        safeCsv(q.dedupFingerprint ?? ""),
        safeCsv(
          Array.isArray(q.contentBlocks) && q.contentBlocks.length > 0 ? "true" : "false"
        ),
        safeCsv(
          Array.isArray(q.mediaAssetIds)
            ? q.mediaAssetIds.map((id) => id.toString()).join(";")
            : ""
        ),
        safeCsv(q.createdAt ? new Date(q.createdAt).toISOString() : ""),
        safeCsv(q.updatedAt ? new Date(q.updatedAt).toISOString() : ""),
      ];

      lines.push(row.join(","));
    }

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("X-Export-Count", String(questions.length));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${exportFilenameBase}.csv`
    );

    return res.status(200).send(lines.join("\n"));
  }

  const uniquePassageIds = [
    ...new Set(
      questions
        .filter((q) => q.passageId)
        .map((q) => String(q.passageId))
    ),
  ].filter((id) => ObjectId.isValid(id));

  const passageDocs = uniquePassageIds.length > 0
    ? ((await db
        .collection("passages")
        .find({
          _id: { $in: uniquePassageIds.map((id) => new ObjectId(id)) },
          isDeleted: { $ne: true },
        })
        .project({
          _id: 1,
          title: 1,
          subjectArea: 1,
          source: 1,
          content: 1,
        })
        .toArray()) as PassageDoc[])
    : [];

  const exportedPassages = passageDocs.map((p) => ({
    id: p._id.toString(),
    title: p.title,
    subjectArea: p.subjectArea,
    source: p.source,
    content: p.content,
  }));

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Export-Count", String(questions.length));
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${exportFilenameBase}.json`
  );

  return res.status(200).json({
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      count: questions.length,
      passages: exportedPassages,
      questions: questions.map((q) => ({
        ...q,
        _id: q._id.toString(),
        passageId: q.passageId?.toString() ?? null,
        mediaAssetIds: Array.isArray(q.mediaAssetIds)
          ? q.mediaAssetIds.map((id) => id.toString())
          : [],
      })),
    },
  });
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^\${}()|[\]\\]/g, "\\\__CODE_3__");
}

function safeCsv(value: unknown): string {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}
