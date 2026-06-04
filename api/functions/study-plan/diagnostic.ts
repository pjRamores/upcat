import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ObjectId } from "mongodb";
import type { SubjectArea } from "@upcat/shared";
import { SUBJECT_AREAS } from "@upcat/shared";
import { requireUser } from "../../src/auth.js";
import { getDb } from "../../src/db.js";
import {
  buildHistoricalDiagnostic,
  buildSelfassessmentDiagnostic,
  calculateSectionInsights,
  type DbDiagnosticTest,
  determineLevel,
  sanitizeQuestionForClient,
  startDiagnostic,
  toApiDiagnostic,
} from "../../src/studyPlan.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const db = await getDb();
  const id = typeof req.query.id === "string" ? req.query.id : null;
  const action = typeof req.query.action === "string" ? req.query.action : "";

  try {
    if (req.method === "POST" && action === "start") {
      const diagnostic = await startDiagnostic(db, user._id);
      return res.status(200).json({
        success: true,
        data: {
          diagnosticId: diagnostic._id.toString(),
          sections: diagnostic.sections.map((s) => ({
            subjectArea: s.subjectArea,
            questionCount: s.questions.length,
          })),
        },
      });
    }

    if (req.method === "GET" && id && action === "questions") {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: "Invalid diagnostic id" });
      }
      const sectionParam = String(req.query.section ?? "") as SubjectArea;
      if (!SUBJECT_AREAS.includes(sectionParam)) {
        return res.status(400).json({ success: false, error: "Invalid section" });
      }

      const diagnostic = await db
        .collection<DbDiagnosticTest>("diagnostic_tests")
        .findOne({ _id: new ObjectId(id), userId: user._id });
      if (!diagnostic) {
        return res.status(404).json({ success: false, error: "Diagnostic not found" });
      }

      const section = diagnostic.sections.find((s) => s.subjectArea === sectionParam);
      if (!section) {
        return res.status(404).json({ success: false, error: "Section not found" });
      }

      const questionIds = section.questions.map((q) => q.questionId);
      const questions = await db
        .collection("questions")
        .find({ _id: { $in: questionIds } })
        .toArray();
      const byId = new Map(questions.map((q) => [String(q._id), q]));

      return res.status(200).json({
        success: true,
        data: {
          subjectArea: sectionParam,
          questions: section.questions
            .map((row) => byId.get(row.questionId.toString()))
            .filter(Boolean)
            .map((q) => sanitizeQuestionForClient(q!)),
        },
      });
    }

    if (req.method === "POST" && id && action === "submit-section") {
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: "Invalid diagnostic id" });
      }
      const body = (req.body ?? {}) as {
        subjectArea?: SubjectArea;
        answers?: { questionId: string; answer: string; timeSpent?: number }[];
      };

      const subjectArea = body.subjectArea;
      if (!subjectArea || !SUBJECT_AREAS.includes(subjectArea)) {
        return res.status(400).json({ success: false, error: "subjectArea is required" });
      }

      const diagnostic = await db
        .collection<DbDiagnosticTest>("diagnostic_tests")
        .findOne({ _id: new ObjectId(id), userId: user._id });
      if (!diagnostic) {
        return res.status(404).json({ success: false, error: "Diagnostic not found" });
      }
      if (diagnostic.status !== "in_progress") {
        return res.status(400).json({ success: false, error: "Diagnostic already completed" });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
const sectionIndex = diagnostic.sections.findIndex((s) => s.subjectArea === subjectArea);
if (sectionIndex === -1) {
    return res.status(404).json({ success: false, error: "Section not found" });
}

const answers = Array.isArray(body.answers) ? body.answers : [];
const answersMap = new Map(answers.map((a) => [String(a.questionId), a]));

const section = diagnostic.sections[sectionIndex];
const questionDocs = await db
    .collection("questions")
    .find({ _id: {$in: section.questions.map((q) => q.questionId) } })
    .project({ _id: 1, correctAnswer: 1 })
    .toArray();
const byQ = new Map(questionDocs.map((q) => [String(q._id), String(q.correctAnswer)]));

section.questions = section.questions.map((q) => {
    const answer = answersMap.get(q.questionId.toString());
    const userAnswer = answer ? answer.answer ?? null;
    const isCorrect = userAnswer ? userAnswer === byQ.get(q.questionId.toString()) : null;
    return {
        ...q,
        userAnswer,
        isCorrect,
        timeSpent: Number(answer ? answer.timeSpent ?? 0),
    };
});

const insights = calculateSectionInsights(section.questions);
section.score = insights.score;
section.assessedLevel = determineLevel(insights.score);

const updatePath = `sections.${sectionIndex}`;
await db.collection("diagnostic_tests").updateOne(
    { _id: diagnostic._id },
    {
        $set: {
            [updatePath]: section,
        },
    },
);

const sectionsRemaining = diagnostic.sections.filter((s, idx) => idx !== sectionIndex && s.score === null).length;
return res.status(200).json({
    success: true,
    data: {
        sectionCompleted: true,
        sectionsRemaining,
        score: section.score,
        level: section.assessedLevel,
    },
});

if (req.method === "POST" && id && action === "complete") {
    if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, error: "Invalid diagnostic id" });
    }

    const diagnostic = await db
        .collection<DbDiagnosticTest>("diagnostic_tests")
        .findOne({ _id: new ObjectId(id), userId: user._id });
    if (!diagnostic) {
        return res.status(404).json({ success: false, error: "Diagnostic not found" });
    }

    const bySubject = diagnostic.sections.map((section) => {
        const insights = calculateSectionInsights(section.questions);
        return {
            subjectArea: section.subjectArea,
            score: insights.score,
            level: insights.level,
            weakSubtopics: insights.weakSubtopics,
            strongSubtopics: insights.strongSubtopics,
        };
    });

    const overall = Math.round(bySubject.reduce((acc, cur) => acc + cur.score, 0) / bySubject.length);
    const result = {
        overall,
        bySubject,
        recommendedPlanDuration: overall >= 75 ? 6 : overall >= 55 ? 8 : 10,
        recommendedDailyHours: overall >= 75 ? 1.5 : overall >= 55 ? 2 : 2.5,
    };

    await db.collection("diagnostic_tests").updateOne(
        { _id: diagnostic._id },
        {
            $set: {
                status: "completed",
                result,
                completedAt: new Date(),
            },
        },
    );

    return res.status(200).json({ success: true, data: { result } });
}

if (req.method === "POST" && action === "skip") {
    const body = (req.body ?? {}) as {
        method?: "historical" | "self_assessment";
        selfAssessment?: { subjectArea: SubjectArea; level: "beginner" | "intermediate" | "advanced" }[];
    };
}
    let diagnosticResults;
    if (body.method === "historical") {
        diagnosticResults = await buildHistoricalDiagnostic(db, user._id);
    } else if (body.method === "self_assessment") {
        diagnosticResults = buildSelfAssessmentDiagnostic(body.selfAssessment ?? []);
    } else {
        diagnosticResults = buildSelfAssessmentDiagnostic([]);
    }

    return res.status(200).json({ success: true, data: { diagnosticResults } });

    if (req.method === "GET" && id && action === "detail") {
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, error: "Invalid diagnostic id" });
        }
        const diagnostic = await db
            .collection<DbDiagnosticTest>("diagnostic_tests")
            .findOne({ _id: new ObjectId(id), userId: user._id });
        if (!diagnostic) {
            return res.status(404).json({ success: false, error: "Diagnostic not found" });
        }
        return res.status(200).json({ success: true, data: toApiDiagnostic(diagnostic) });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
} catch (error) {
    console.error("[study-plan/diagnostic] failed", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
}