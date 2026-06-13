/**
 * Question bank - admin list / create.
 *
 * GET /api/admin/questions -> paginated list
 * POST /api/admin/questions -> create new question
 */
import { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId, type Collection, type Db, type Document } from "mongodb";
import { requireAdmin } from "../../../src/auth.js";
import { getDb } from "../../..//src/db.js";
import { logActivity } from "../../../src/activityLog.js";
import {
  DIFFICULTIES,
  type Difficulty,
  SUBJECT_AREAS,
  type SubjectArea,
} from "@upcat/shared";
import {
  buildQuestionFingerprint,
  normalizeRichContentBlocks,
  type QuestionPublicationStatus,
} from "../../../src/questionManagement.js";

const SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "subjectArea",
  "difficulty",
  "flagCount",
  "usageCount",
] as const);

type QuestionDoc = Document & {
  _id: ObjectId;
  setId?: string | ObjectId;
  subjectArea?: SubjectArea;
  subtopic?: string;
  difficulty?: Difficulty;
  type?: "multiple_choice" | "passage_based";
  questionText?: string;
  correctAnswer?: "A" | "B" | "C" | "D";
  flagCount?: number;
  usageCount?: number;
  publicationStatus?: QuestionPublicationStatus | null;
  version?: number;
  contentBlocks?: unknown[];
  isDeleted?: boolean;
  isDraft?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const db = await getDb();
  const col = db.collection<QuestionDoc>("questions");

  if (req.method === "GET") return listQuestions(req, res, col);
  if (req.method === "POST") return createQuestion(req, res, db, admin._id);

  res.setHeader("Allow", "GET,POST");
  return res.status(405).json({ success: false, error: "Method not allowed" });
}

async function listQuestions(
  req: VercelRequest,
  res: VercelResponse,
  col: Collection<QuestionDoc>,
) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
  const search = (req.query.search as string | undefined)?.trim();
  const subjectArea = (req.query.subjectArea as string | undefined)?.trim();
  const setId = (req.query.setId as string | undefined)?.trim();
  const subtopic = (req.query.subtopic as string | undefined)?.trim();
  const topic = (req.query.topic as string | undefined)?.trim();
  const difficulty = (req.query.difficulty as string | undefined)?.trim();
  const type = (req.query.type as string | undefined)?.trim();
  const publicationStatus = (req.query.publicationStatus as string | undefined)?.trim();
  const hasFlagged = req.query.hasFlaggedReports === "true";
  const includeDeleted = req.query.includeDeleted === "true";
  const sortBy = SORT_FIELDS.has(String(req.query.sortBy) as never)
    ? String(req.query.sortBy)
    : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const filter: Record<string, unknown> = {};
  const andClauses: Record<string, unknown>[] = [];

  if (!includeDeleted) filter.isDeleted = { $ne: true };

  if (setId) {
    if (ObjectId.isValid(setId)) {
      andClauses.push({
        $or: [{ setId }, { setId: new ObjectId(setId) }],
      });
    } else {
      filter.setId = setId;
    }
  }

  if (subjectArea) filter.subjectArea = subjectArea;
  if (subtopic) filter.subtopic = subtopic;

  if (topic) {
    const tags = topic
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (tags.length > 0) filter.tags = { $in: tags };
  }

  if (difficulty) filter.difficulty = difficulty;
  if (type) filter.type = type;
  if (publicationStatus) andClauses.push(buildPublicationStatusFilter(publicationStatus));
  if (hasFlagged) filter.flagCount = { $gt: 0 };
  if (search) filter.questionText = { $regex: escapeRegex(search), $options: "i" };

  if (andClauses.length > 0) {
    filter.$and = andClauses;
  }

  const [items, total, subjectCounts, difficultyCounts] = await Promise.all([
    col
      .find(filter, {
        projection: {
          setId: 1,
          subjectArea: 1,
          subtopic: 1,
          difficulty: 1,
          type: 1,
          questionText: 1,
          correctAnswer: 1,
          flagCount: 1,
          usageCount: 1,
          publicationStatus: 1,
          version: 1,
          contentBlocks: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .sort({ [sortBy]: sortOrder })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
    col
      .aggregate<{ _id: string; n: number }>([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: "$subjectArea", n: { $sum: 1 } } },
      ])
      .toArray(),
    col
      .aggregate<{ _id: string; n: number }>([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: "$difficulty", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      items: items.map((q) => ({
        _id: q._id.toString(),
        setId:
          q.setId instanceof ObjectId ? q.setId.toString() : (q.setId ?? "set-default"),
        subjectArea: q.subjectArea,
        subtopic: q.subtopic,
        difficulty: q.difficulty,
        type: q.type,
        questionTextPreview: String(q.questionText ?? "").slice(0, 120),
        correctAnswer: q.correctAnswer,
        flagCount: q.flagCount ?? 0,
        usageCount: q.usageCount ?? 0,
        isDeleted: q.isDeleted ?? false,
        publicationStatus: q.publicationStatus ?? "draft",
        version: q.version ?? 1,
        hasRichContent: Array.isArray(q.contentBlocks) && q.contentBlocks.length > 0,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      filterCounts: {
        bySubject: aggToMap(subjectCounts),
        byDifficulty: aggToMap(difficultyCounts),
      },
    },
  });
}

async function createQuestion(
  req: VercelRequest,
  res: VercelResponse,
  db: Db,
  adminId: ObjectId,
) {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const validation = validateQuestionPayload(body);

  if (!validation.ok) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const now = new Date();
  const doc = {
    ...validation.value,
    flagCount: 0,
    usageCount: 0,
    isDeleted: false,
    isDraft: true,
    publicationStatus: "draft" as const,
    version: 1,
    editHistory: [] as unknown[],
    createdAt: now,
    updatedAt: now,
    createdBy: adminId,
  };

  const result = await db.collection("questions").insertOne(doc);

  await logActivity(db, {
    actorId: adminId,
    actorRole: "admin",
    action: "question.created",
    targetType: "question",
    targetId: result.insertedId,
    metadata: {
      subjectArea: validation.value.subjectArea,
      difficulty: validation.value.difficulty,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      _id: result.insertedId.toString(),
      ...doc,
    },
  });
}

function aggToMap(arr: { _id: string; n: number }[]): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, r) => {
    acc[String(r._id ?? "unknown")] = r.n;
    return acc;
  }, {});
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^\${}()|[\]\\]/g, "\\\__CODE_1__");
}

function buildPublicationStatusFilter(publicationStatus: string): Record<string, unknown> {
  const normalized = normalizePublicationStatus(publicationStatus);

  if (normalized === "draft") {
    return {
      $or: [
        { publicationStatus: "draft" },
        { publicationStatus: { $exists: false }, isDraft: { $ne: false } },
        { publicationStatus: null, isDraft: { $ne: false } },
      ],
    };
  }

  if (normalized === "published") {
    return {
      $or: [
        { publicationStatus: "published" },
        { publicationStatus: { $exists: false }, isDraft: false },
        { publicationStatus: null, isDraft: false },
      ],
    };
  }

  return { publicationStatus: normalized };
}

export interface ValidatedQuestion {
  setId: string;
  subjectArea: SubjectArea;
  subtopic: string;
  difficulty: Difficulty;
  type: "multiple_choice" | "passage_based";
  passageId: ObjectId | null;
  questionText: string;
  choices: { label: "A" | "B" | "C" | "D"; text: string }[];
  correctAnswer: "A" | "B" | "C" | "D";
  rationale: string;
  tags: string[];
  contentBlocks: ReturnType<typeof normalizeRichContentBlocks>;
  mediaAssetIds: ObjectId[];
  dedupFingerprint: string;
}

export function validateQuestionPayload(
  body: Record<string, unknown>,
): { ok: true; value: ValidatedQuestion } | { ok: false; error: string } {
  const setId = String(body.setId ?? "set-default").trim();
  if (!setId) return { ok: false, error: "setId is required" };

  const subjectArea = String(body.subjectArea ?? "");
  if (!SUBJECT_AREAS.includes(subjectArea as SubjectArea)) {
    return {
      ok: false,
      error: `subjectArea must be one of: ${SUBJECT_AREAS.join(", ")}`,
    };
  }

  const difficulty = String(body.difficulty ?? "");
  if (!DIFFICULTIES.includes(difficulty as Difficulty)) {
    return {
      ok: false,
      error: `difficulty must be one of: ${DIFFICULTIES.join(", ")}`,
    };
  }

  const type =
    body.type === "passage_based" ? "passage_based" : "multiple_choice";

  const subtopic = String(body.subtopic ?? "").trim();
  if (!subtopic) return { ok: false, error: "subtopic is required" };

  const questionText = String(body.questionText ?? "").trim();
  if (questionText.length < 5) {
    return { ok: false, error: "questionText is too short" };
  }

  const choicesIn = Array.isArray(body.choices) ? body.choices : [];
  if (choicesIn.length !== 4) {
    return { ok: false, error: "choices must have exactly 4 items" };
  }

  const labels: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
  const choices = choicesIn.map((c, i) => ({
    label: labels[i],
    text: String((c as { text?: unknown }).text ?? "").trim(),
  }));

  if (choices.some((c) => !c.text)) {
    return { ok: false, error: "every choice must have non-empty text" };
  }

  const correctAnswer = String(body.correctAnswer ?? "").toUpperCase();
  if (!labels.includes(correctAnswer as "A" | "B" | "C" | "D")) {
    return { ok: false, error: "correctAnswer must be one of A, B, C, D" };
  }

  let passageId: ObjectId | null = null;
  if (type === "passage_based") {
    if (!body.passageId || !ObjectId.isValid(String(body.passageId))) {
      return {
        ok: false,
        error: "passageId is required for passage-based questions",
      };
    }
    passageId = new ObjectId(String(body.passageId));
  }

  const rationale = String(body.rationale ?? "").trim();

  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
    : [];

  const contentBlocks = normalizeRichContentBlocks(body.contentBlocks);

  const mediaAssetIds = Array.isArray(body.mediaAssetIds)
    ? (body.mediaAssetIds as unknown[])
        .map((id) => String(id))
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id))
    : [];

  const dedupFingerprint = buildQuestionFingerprint({
    subjectArea,
    subtopic,
    difficulty,
    questionText,
    choices,
  });

  return {
    ok: true,
    value: {
      setId,
      subjectArea: subjectArea as SubjectArea,
      subtopic,
      difficulty: difficulty as Difficulty,
      type,
      passageId,
      questionText,
      choices,
      correctAnswer: correctAnswer as "A" | "B" | "C" | "D",
      rationale,
      tags,
      contentBlocks,
      mediaAssetIds,
      dedupFingerprint,
    },
  };
}

export function normalizePublicationStatus(
  input: unknown,
): QuestionPublicationStatus {
  const value = String(input ?? "").trim();
  if (value === "published") return "published";
  if (value === "in_review") return "in_review";
  if (value === "archived") return "archived";
  return "draft";
}
