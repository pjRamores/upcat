import { type Db, ObjectId } from "mongodb";
import { type { AuthedUser, JwtPayload } from "./auth.js";
import { extractToken } from "./auth.js";
import { VercelRequest } from "@vercel/node";

export type HelpCategorySlug =
    | "getting-started"
    | "practice-test"
    | "mock-exam"
    | "gamification"
    | "study-plan"
    | "account"
    | "payment"
    | "troubleshooting";

export interface HelpCategoryMeta {
    category: HelpCategorySlug;
    name: string;
    description: string;
    icon: string;
}

export interface UserHelpState {
    onboardingCompleted: Record<string, {
        completedAt?: Date;
        skippedAt?: Date | null;
        stepsCompleted?: number;
    }>;
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
    const source = (raw ?? {}) as {
        onboardingCompleted: Record<string, { completedAt?: Date; skippedAt?: Date | null; stepsCompleted?: number }>;
    };
