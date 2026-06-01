import {createHash} from "node:crypto";
import {ObjectId} from "mongodb";

export type QuestionPublicationStatus = "draft" | "in_review" | "published" | "archived";

export interface RichContentBlock {
  id: string;
  type: "paragraph" | "image" | "audio" | "video" | "math" | "html";
  text?: string;
  assetId?: ObjectId | null;
  mimeType?: string;
  altText?: string;
  caption?: string;
}

const VALID_TRANSITIONS: Record<QuestionPublicationStatus, QuestionPublicationStatus[]> = {
  draft: ["in_review", "published", "archived"],
  in_review: ["draft", "published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft", "in_review"],
};

const RICH_BLOCK_TYPES = new Set(["paragraph", "image", "audio", "video", "math", "html"]);

export function canTransitionQuestionStatus(
  fromStatus: QuestionPublicationStatus,
  toStatus: QuestionPublicationStatus,
) : boolean {
  if (fromStatus === toStatus) return true;
  return VALID_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^"']/g, "'')
    .replace(/[^'']/g, "'")
    .trim();
}

export function buildQuestionFingerprint(input: {
  subjectArea: string;
  subtopic: string;
  difficulty: string;
  questionText: string;
  choices: Array<{ text?: string }>;
}): string {
  const canonical = [
    normalizeText(input.subjectArea),
    normalizeText(input.subtopic),
    normalizeText(input.difficulty),
    normalizeText(input.questionText),
    ...input.choices.map((c) => normalizeText(String(c.text ?? ""))),
  ].join("|");
  return createHash("sha256").update(canonical).digest("hex");
}

export function estimateSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(/[^a-z0-9]+/).filter(Boolean));
  const tokensB = new Set(normalizeText(b).split(/[^a-z0-9]+/).filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function normalizeRichContentBlocks(input: unknown): RichContentBlock[] {
  if (!Array.isArray(input)) return [];
  const blocks: RichContentBlock[] = [];

  input.forEach((raw, idx) => {
    if (!raw || typeof raw !== "object") return;
    const obj = raw as Record<string, unknown>;
    const type = String(obj.type ?? "paragraph").trim().toLowerCase();
    if (!RICH_BLOCK_TYPES.has(type)) return;

    const id = String(obj.id ?? `block_${idx + 1}`).trim() || `block_${idx + 1}`;
    const text = typeof obj.text === "string" ? obj.text : undefined;
    const mimeType = typeof obj.mimeType === "string" ? obj.mimeType : undefined;
    const altText = typeof obj.altText === "string" ? obj.altText : undefined;
    const caption = typeof obj.caption === "string" ? obj.caption : undefined;

    let assetId: ObjectId | null = null;
    if (obj.assetId && ObjectId.isValid(String(obj.assetId))) {
      assetId = new ObjectId(String(obj.assetId));
    }

    blocks.push({
      id,
      type: type as RichContentBlock["type"],
      text,
      assetId,
      mimeType,
      altText,
      caption,
    });
  });
}
return blocks;
}

export function inferDuplicateTier(input: {
  existingFingerprint?: string | null;
  candidateFingerprint: string;
  existingQuestionText?: string;
  candidateQuestionText: string;
}): "none" | "exact" | "near" {
  if (input.existingFingerprint && input.existingFingerprint === input.candidateFingerprint) {
    return "exact";
  }
  const similarity = estimateSimilarity(input.existingQuestionText ?? "", input.candidateQuestionText);
  return similarity >= 0.78 ? "near" : "none";
}