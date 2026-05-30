import { type } from "mongodb";
import { DEFAULT_EXAM_CONFIG, SUBJECT_AREAS, type } from "@upcat/shared";

type ExamDifficulty = "easy" | "medium" | "hard" | "very_hard";

export interface QuestionSetConfigDoc {
  _id?: string;
  setId: string;
  isActive: boolean;
  priority: number;
  assignmentCount: number;
  distribution: Record<SubjectArea, { questions: number; timeLimit: number }>;
  difficultyMix: Record<ExamDifficulty, number>;
  createdAt: Date;
  updatedAt: Date;
}

interface UserSetAssignmentDoc {
  _id?: ObjectId;
  userId: ObjectId;
  setId: unknown;
  assignedCount: number;
  lastSessionId?: ObjectId;
  lastAssignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface RecentSessionSetDoc {
  setId?: unknown;
  config?: {
    setId?: unknown;
  } | null;
  startedAt?: Date;
  createdAt?: Date;
}

function setDocIdValue(doc: Partial<QuestionSetConfigDoc> & { _id?: unknown }): string {
  if (doc.setId) return normalizeSetId(doc.setId);
  return normalizeSetId(doc._id);
}

function normalizeSetId(raw: unknown): string {
  const value = String(raw ?? "").trim();
  return value || "set-default";
}

function extractSessionSetId(session: RecentSessionSetDoc | null | undefined): string | null {
  if (!session) return null;
  const raw = String(session.setId ?? session.config?.setId ?? "").trim();
  return raw ? normalizeSetId(raw) : null;
}

function toComparableTime(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function normalizeUserSetAssignments(db: Db, userId: ObjectId): Promise<UserSetAssignmentDoc[]> {
  const assignments = await db
    .collection<UserSetAssignmentDoc>("exam_set_assignments")
    .find({userId})
    .toArray();

  if (assignments.length === 0) return [];

  const grouped = new Map<string, UserSetAssignmentDoc[]>();
  for (const assignment of assignments) {
    const normalizedSetId = normalizeSetId(assignment.setId);
    const existing = grouped.get(normalizedSetId) ?? [];
    existing.push(assignment);
    grouped.set(normalizedSetId, existing);
  }

  const normalizedAssignments: UserSetAssignmentDoc[] = [];
  const bulkOps: Array<Record<string, unknown>> = [];
  const now = new Date();

  for (const [normalizedSetId, group] of grouped) {
    const needsNormalization = group.length > 1 || group.some((assignment) => String(assignment.setId ?? "").trim() !== normalizedSetId);
    const canonical = group.find((assignment) => typeof assignment.setId === "string" && assignment.setId.trim() === normalizedSetId) ?? group[0];
    if (!canonical) continue;

    const mergedAssignedCount = group.reduce((total, assignment) => total + Math.max(0, Number(assignment.assignCount ?? 0)), 0);
    const mostRecentDoc = group.reduce((latest, assignment) => {
      const latestTime = Math.max(
        toComparableTime(latest.lastAssignedAt),
        toComparableTime(latest.updatedAt),
        toComparableTime(latest.createdAt),
      );
      const currentTime = Math.max(
        toComparableTime(assignment.lastAssignedAt),
        toComparableTime(assignment.updatedAt),
        toComparableTime(assignment.createdAt),
      );
    });
  }
}
);
return currentTime > latestTime ? assignment : latest;
}, canonical);
const mergedCreatedAt = group.reduce((earliest, assignment) => {
  const assignmentTime = toComparableTime(assignment.createdAt);
  if (assignmentTime === 0) return earliest;
  if (!earliest || assignmentTime < earliest.getTime()) return new Date(assignmentTime);
  return earliest;
}, canonical.createdAt ? new Date(canonical.createdAt) : null as Date | null);

const normalizedAssignment: UserSetAssignmentDoc = {
  ...canonical,
  setId: normalizedSetId,
  assignedCount: mergedAssignedCount,
  lastAssignedAt: mostRecentDoc.lastAssignedAt ?? canonical.lastAssignedAt,
  updatedAt: mostRecentDoc.updatedAt ?? now,
  createdAt: mergedCreatedAt ?? canonical.createdAt,
  ...(mostRecentDoc.lastSessionId ? {lastSessionId: mostRecentDoc.lastSessionId} : {}),
};
normalizedAssignments.push(normalizedAssignment);

if (!needsNormalization || !canonical._id) continue;

const setPayload: Record<string, unknown> = {
  userId,
  setId: normalizedSetId,
  assignedCount: mergedAssignedCount,
  lastAssignedAt: normalizedAssignment.lastAssignedAt,
  updatedAt: now,
  createdAt: normalizedAssignment.createdAt,
};
if (normalizedAssignment.lastSessionId) {
  setPayload.lastSessionId = normalizedAssignment.lastSessionId;
}

bulkOps.push({
  updateOne: {
    filter: {_id: canonical._id},
    update: {
      $set: setPayload,
      ...(normalizedAssignment.lastSessionId ? {} : {$unset: {lastSessionId: ""}}),
    },
  },
});

for (const duplicate of group) {
  if (!duplicate._id || duplicate._id.equals(canonical._id)) continue;
  bulkOps.push({
    deleteOne: {
      filter: {_id: duplicate._id},
    },
  });
}

if (bulkOps.length > 0) {
  const assignmentCollection = db.collection("exam_set_assignments") as unknown as {
    bulkWrite?: (operations: Array<Record<string, unknown>>, options?: {
      ordered?: boolean
    }) => Promise<unknown>;
  };
  if (typeof assignmentCollection.bulkWrite === "function") {
    await assignmentCollection.bulkWrite(bulkOps, {ordered: true});
  }
}

return normalizedAssignments;
}

async function loadUserSessionSetCounts(db: Db, userId: ObjectId): Promise<{
  countBySet: Map<string, number>;
  mostRecentSetId: string | null;
}> {
  const sessions = await db
    .collection<RecentSessionSetDoc>("exam_sessions")
    .find(
      {userId},
      {projection: {setId: 1, "config.setId": 1, startedAt: 1, createdAt: 1}},
    )
    .sort({startedAt: -1, createdAt: -1})
    .toArray();

  const countBySet = new Map<string, number>();
  for (const session of sessions) {
    const normalizedSetId = extractSessionSetId(session);
    if (!normalizedSetId) continue;
    countBySet.set(normalizedSetId, (countBySet.get(normalizedSetId) ?? 0) + 1);
  }

  return {
    countBySet,
    mostRecentSetId: extractSessionSetId(sessions[0]),
  };
}

function buildDefaultDistribution(): Record<SubjectArea, { questions: number; timeLimit: number }} {
  const totalQuestions = Math.max(1, Number(DEFAULT_EXAM_CONFIG.totalQuestions ?? 100));
  const totalTimeLimit = Math.max(1, Number(DEFAULT_EXAM_CONFIG.timeLimit ?? 180));

  return Object.fromEntries(
    SUBJECT_AREAS.map((subject) => {
      const questions = Math.max(
        0,
        Math.floor(Number((DEFAULT_EXAM_CONFIG.distribution as Record<string, number>)[subject] ?? 0)),
const timeLimit = Math.max(
1,
Math.round((questions * totalTimeLimit) / Math.max(1, totalQuestions)),
);
return [subject, {questions, timeLimit}];
});
as Record<SubjectArea, {questions: number; timeLimit: number}};
}

function buildDefaultDifficultyMix(): Record<ExamDifficulty, number> {
return {
easy: Number(DEFAULT_EXAM_CONFIG.difficultyMix.easy ?? 0),
medium: Number(DEFAULT_EXAM_CONFIG.difficultyMix.medium ?? 0),
hard: Number(DEFAULT_EXAM_CONFIG.difficultyMix.hard ?? 0),
very_hard: Number((DEFAULT_EXAM_CONFIG.difficultyMix as Record<string, number]).very_hard ?? 0),
};
}

function isDuplicateKeyError(error: unknown): boolean {
if (!error || typeof error !== "object") return false;
const maybe = error as {
code?: unknown;
writeErrors?: Array<{ code?: unknown }>;
errorResponse?: { code?: unknown }
};
if (Number(maybe.code) === 11000) return true;
if (Number(maybe.errorResponse?.code) === 11000) return true;
return Array.isArray(maybe.writeErrors) && maybe.writeErrors.some((w) => Number(w?.code) === 11000);
}

/**
 * Ensures existing questions have a normalized top-level setId.
 */
export async function ensureQuestionSetIdDefaults(db: Db): Promise<void> {
const questionsCol = db.collection("questions") as unknown as {
updateMany?: (...args: unknown[]) => Promise<unknown>
};
if (typeof questionsCol.updateMany !== "function") return;

await questionsCol.updateMany(
{
$or: [
setId: {$exists: false}},
setId: null,
setId: ""
],
{
$set: {setId: "set-default", updatedAt: new Date()},
}
);

/**
 * If no set configuration exists yet, bootstrap one entry per discovered setId.
 */
export async function ensureQuestionSetConfigs(db: Db): Promise<QuestionSetConfigDoc[]> {
const setsCol = db.collection<QuestionSetConfigDoc>("question_sets");
const existing = await setsCol.find({isActive: {$ne: false}}).toArray();
const allExisting = await setsCol.find({}).toArray();

const questionsCol = db.collection("questions") as unknown as {
distinct?: (field: string, filter?: Record<string, unknown>) => Promise<unknown>};
};

const questionSetIds = typeof questionsCol.distinct === "function"
? await questionsCol.distinct("setId", {isDeleted: {$ne: true}})
: ["set-default"];

const normalized = Array.from(
new Set(
questionSetIds
.map((id) => normalizeSetId(id))
filter(Boolean),
));
);

const setIds = normalized.length > 0 ? normalized : ["set-default"];
const now = new Date();
const existingSetIds = new Set(allExisting.map((doc) => setDocIdValue(doc as QuestionSetConfigDoc && {
_id?: unknown
}))));
const docs: QuestionSetConfigDoc[] = setIds
.filter((setId) => !existingSetIds.has(setId))
.map((setId) => ({
setId,
isActive: true,
priority: 1,
assignmentCount: 0,
distribution: buildDefaultDistribution(),
difficultyMix: buildDefaultDifficultyMix(),
createdAt: now,
updatedAt: now,
})));

if (existing.length > 0 && docs.length === 0) {
return existing.map((doc) => ({
...doc,
setId: setDocIdValue(doc as QuestionSetConfigDoc && {_id?: unknown}),
}));
}

if (docs.length > 0) {
const inserts = setsCol as unknown as {
insertMany?: (d: QuestionSetConfigDoc[], o?: {ordered?: boolean}) => Promise<unknown>
};
};
if (typeof inserts.insertMany === "function") {
  try {
    await inserts.insertMany(docs, {ordered: false});
  } catch (error) {
    // Concurrent warmups can attempt the same setId inserts; unique index handles integrity.
    if (!isDuplicateKeyError(error)) throw error;
  }
} else {
  return docs;
}
}

const refreshed = await setsCol.find({isActive: {$ne: false}}).toArray();
return refreshed.map((doc) => ({
  ...doc,
  setId: setDocIdValue(doc as QuestionSetConfigDoc && {_id?: unknown}),
  }));

export async function pickQuestionSetForUser(
  db: Db,
  userId: ObjectId,
) : Promise<QuestionSetConfigDoc> {
  await ensureQuestionSetIdDefaults(db);
  const sets = await ensureQuestionSetConfigs(db);

  const questionsCol = db.collection("questions").as<unknown> as {
    distinct?: (field: string, filter?: Record<string, unknown>) => Promise<unknown[]>;
  };

  const eligibleRaw = typeof questionsCol.distinct === "function"
    ? await questionsCol.distinct("setId", {
      isDeleted: {$ne: true},
      publicationStatus: "published",
    })
    : sets.map((s) => s.setId);

  const eligibleSetIds = new Set(
    eligibleRaw
    .map((id) => normalizeSetId(id))
    .filter(Boolean),
  );

  if (eligibleSetIds.size === 0) {
    throw new Error("No eligible questions available in question bank");
  }

  let usableSets = sets.filter((s) => eligibleSetIds.has(normalizeSetId(s.setId)));

  // If admins created active sets with no questions yet, fall back to a set that actually has questions.
  if (usableSets.length === 0) {
    const fallbackSetId = eligibleSetIds.has("set-default")
      ? "set-default"
      : Array.from(eligibleSetIds)[0];

    const now = new Date();
    await db.collection("question_sets").updateOne(
      {setId: fallbackSetId},
      {
        $set: {isActive: true, updatedAt: now},
        $setOnInsert: {
          setId: fallbackSetId,
          priority: 1,
          assignmentCount: 0,
          distribution: buildDefaultDistribution(),
          difficultyMix: buildDefaultDifficultyMix(),
          createdAt: now,
        },
      },
      {upsert: true},
    );

    const fallback = await db.collection<QuestionSetConfigDoc>("question_sets").findOne({setId: fallbackSetId});
    if (!fallback) {
      throw new Error("No active question sets configured");
    }
    usableSets = [fallback];
  }

  const userAssignments = await normalizeUserSetAssignments(db, userId);

  const assignmentCountBySet = new Map<string, number>();
  for (const assignment of userAssignments) {
    const normalizedSetId = normalizeSetId(assignment.setId);
    assignmentCountBySet.set(
      normalizedSetId,
      (assignmentCountBySet.get(normalizedSetId) ?? 0) + Math.max(0, Number(assignment.assignCount ?? 0)),
    );
  }

  const {countBySet: sessionCountBySet, mostRecentSetId} = await loadUserSessionSetCounts(db, userId);
  const historicallyAssignedSetIds = new Set<string>([
    ...assignmentCountBySet.keys(),
    ...sessionCountBySet.keys(),
  ]);

  // Step 1: prefer sets the user has never been assigned.
  const unassigned = usableSets.filter((s) => !historicallyAssignedSetIds.has(normalizeSetId(s.setId)));
  let candidates = unassigned.length > 0 ? unassigned : usableSets;

  // Step 1.5: when we have alternatives, avoid reusing the immediately previous set.
  if (mostRecentSetId && candidates.length > 1) {
    const notMostRecent = candidates.filter((s) => normalizeSetId(s.setId) !== mostRecentSetId);
if (notMostRecent.length > 0) {
  candidates = notMostRecent;
}
}

// Step 2: among candidates, prefer those with the fewest user-level assignments.
const effectiveCountForSet = (setId: string) => Math.max(
  assignmentCountBySet.get(setId) ?? 0,
  sessionCountBySet.get(setId) ?? 0,
);

const minUserCount = Math.min(...candidates.map((c) => effectiveCountForSet(normalizeSetId(c.setId))));
const leastAssigned = candidates.filter((c) => effectiveCountForSet(normalizeSetId(c.setId)) === minUserCount);

// Step 3: break ties by lowest priority value (1 = highest priority).
const minPriority = Math.min(...leastAssigned.map((c) => Number(c.priority ?? 1)));
const topPriority = leastAssigned.filter((c) => Number(c.priority ?? 1) === minPriority);

const chosen = topPriority[Math.floor(Math.random() * topPriority.length)] ?? candidates[0];

return chosen;
}

export async function registerQuestionSetAssignment(
  db: Db,
  userId: ObjectId,
  setId: string,
  sessionId?: ObjectId,
) : Promise<void> {
  const normalizedSetId = normalizeSetId(setId);
  const now = new Date();

  await normalizeUserSetAssignments(db, userId);

  await db.collection("question_sets").updateOne(
    {setId: normalizedSetId},
    {
      $inc: {assignmentCount: 1},
      $set: {updatedAt: now},
      $setOnInsert: {
        setId: normalizedSetId,
        isActive: true,
        distribution: buildDefaultDistribution(),
        difficultyMix: buildDefaultDifficultyMix(),
        createdAt: now,
      },
    },
    {upsert: true},
  );

  await db.collection<UserSetAssignmentDoc>("exam_set_assignments").updateOne(
    {userId, setId: normalizedSetId},
    {
      $inc: {assignedCount: 1},
      $set: {
        lastAssignedAt: now,
        updatedAt: now,
        ...(sessionId ? {lastSessionId: sessionId} : {})},
      },
      $setOnInsert: {userId, setId: normalizedSetId, createdAt: now},
    },
    {upsert: true},
  );

  if (sessionId) {
    await db.collection<UserSetAssignmentEventDoc>("exam_set_assignment_events").insertOne({
      userId,
      setId: normalizedSetId,
      sessionId,
      assignedAt: now,
      createdAt: now,
    });
  }
}