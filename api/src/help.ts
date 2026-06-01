import {type Db, ObjectId} from "mongodb";
import type {AuthedUser, JwtPayload} from "./auth.js";
import {extractToken} from "./auth.js";
import type {VercelRequest} from "@vercel/node";

export type HelpCategorySlug =
  "getting-started"
  "practice-test"
  "mock-exam"
  "gamification"
  "study-plan"
  "account"
  "payment"
  "troubleshooting";

export interface HelpCategoryMeta {
  category: HelpCategorySlug;
  name: string;
  description: string;
  icon: string;
}

export interface UserHelpState {
  onboardingCompleted: Record<
    string,
    {
      completedAt?: Date;
      skippedAt?: Date | null;
      stepsCompleted?: number;
    }
  >;
  dismissedHelp: string[];
  helpPreferences: {
    showTooltips: boolean;
    showOnboarding: boolean;
    reducedHelp: boolean;
  };
}

export const HELP_CATEGORIES: HelpCategoryMeta[] = [
  {
    category: "getting-started",
    name: "Getting Started",
    description: "Start here for account setup, dashboard basics, and your first study session.",
    icon: "rocket",
  },
  {
    category: "practice-test",
    name: "Practice Tests",
    description: "Learn how to configure, take, and review flexible practice sessions.",
    icon: "clipboard-list",
  },
  {
    category: "mock-exam",
    name: "Mock Exams",
    description: "Understand strict exam simulation, scoring, and readiness signals.",
    icon: "target",
  },
  {
    category: "gamification",
    name: "Gamification & Progress",
    description: "XP, levels, badges, weekly challenges, and leaderboard behavior.",
    icon: "trophy",
  },
  {
    category: "study-plan",
    name: "Study Plan",
    description: "Diagnostic setup, daily sessions, assessments, and adaptive pacing.",
    icon: "book-open",
  },
  {
    category: "account",
    name: "Account & Settings",
    description: "Manage security, profile details, linked accounts, and preferences.",
    icon: "settings",
  },
  {
    category: "payment",
    name: "Premium & Payments",
    description: "Learn premium benefits, billing flow, and subscription lifecycle.",
    icon: "credit-card",
  },
  {
    category: "troubleshooting",
    name: "Troubleshooting",
    description: "Fix common issues quickly and know when to contact support.",
    icon: "wrench",
  },
];

const CATEGORY_LOOKUP = new Set(HELP_CATEGORIES.map((c) => c.category));

export function isHelpCategory(value: string): value is HelpCategorySlug {
  return CATEGORY_LOOKUP.has(value as HelpCategorySlug);
}

export function toInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeUserHelp(raw: unknown): UserHelpState {
  const source = (raw ?? {}).as {
    onboardingCompleted?: Record<string, {completedAt?: Date; skippedAt?: Date | null; stepsCompleted?: number}};
dismissedHelp?: string[];
helpPreferences?: { showTooltips?: boolean; showOnboarding?: boolean; reducedHelp?: boolean };
};

return {
onboardingCompleted: source.onboardingCompleted ?? {},
dismissedHelp: Array.isArray(source.dismissedHelp) ? source.dismissedHelp.filter(Boolean) : [],
helpPreferences: {
showTooltips: source.helpPreferences?.showTooltips ?? true,
showOnboarding: source.helpPreferences?.showOnboarding ?? true,
reducedHelp: source.helpPreferences?.reducedHelp ?? false,
},
};
}

export function userIsNew(user: { createdAt?: Date | string | null }, windowDays: number): boolean {
if (!user?.createdAt) return false;
const createdAt = new Date(user.createdAt);
if (Number.isNaN(createdAt.getTime())) return false;
const ageMs = Date.now() - createdAt.getTime();
return ageMs <= windowDays * 24 * 60 * 60 * 1000;
}

export function stripMarkdown(markdown: string) {
return markdown
.replace(/`$$[^\s\S]*?$$/g, " ")
.replace(/`[^`]+/g, " ")
.replace(/!$$[^\s\S]*$$([^`])*/g, " ")
.replace(/$$[^\s\S]+$$([^`])*/g, " ")
.replace(/^\s{0,3}#{1,6}\s+/gm, " ")
.replace(/^\s*>\s?/gm, " ")
.replace(/^\s*[-*+]\s+/gm, " ")
.replace(/^\s*\d+\.\s+/gm, " ")
.replace(/\\|/g, " ")
.replace(/[*_~]/g, " ")
.replace(/\s+/g, " ")
.trim();
}

function escapeRegExp(input: string) : string {
return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightExcerpt(text: string, term: string, radius: 90) : string {
if (!text) return "";
if (!term.trim()) return text.slice(0, radius * 2);
const regex = new RegExp(escapeRegExp(term), "i");
const match = regex.exec(text);
if (!match || match.index < 0) return text.slice(0, radius * 2);
const start = Math.max(0, match.index - radius);
const end = Math.min(text.length, match.index + match[0].length + radius);
const chunk = text.slice(start, end);
return chunk.replace(regex, (m) => `<mark>${m}</mark>`);
}

export async function resolveOptionalUser(
db: Db,
req: VercelRequest,
) : Promise<(AuthedUser & {_id: ObjectId }) | null> {
const payload = extractToken(req) as JwtPayload | null;
if (!payload?.userId || !ObjectId.isValid(payload.userId)) return null;
const user = await db
.collection("users")
.findOne({_id: new ObjectId(payload.userId)}) as (AuthedUser & {_id: ObjectId }) | null;
if (!user || user.isActive === false) return null;
return user;
}

export function checkOnboardingTriggers(
user: { help?: unknown; gamification?: { xp?: number }; createdAt?: Date | string | null },
currentPage: string,
) : string | null {
const help = normalizeUserHelp(user.help);
const completed = help.onboardingCompleted;

if (!completed.new_user_tour?.completedAt && !completed.new_user_tour?.skippedAt) {
return "new_user_tour";
}
if (currentPage === "/practice-test/configure") && !completed.first_practice_tour?.completedAt && !completed.first_practice_tour?.skippedAt) {
return "first_practice_tour";
}
if ((currentPage.startsWith("/mock-exam")) || currentPage === "/dashboard") && !completed.first_mock_tour?.completedAt && !completed.first_mock_tour?.skippedAt) {
return "first_mock_tour";
}
const xp = user.gamification?.xp ?? 0;
if (xp > 0 && xp <= 100 && !completed.gamification_intro?.completedAt && !completed.gamification_intro?.skippedAt) {
return "gamification_intro";
}
return null;
}

export function normalizeContextualPage(pathname: string) : string {
if (/^\/exam\///.test(pathname)) return "/exam/:id";
if (/^\/payment\///.test(pathname)) return "/payment";
return pathname;
}