import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {getDb} from "./db.js";

function loadEnvFile() {
    const envPath = resolve(process.cwd(), ".env");
    if (!existsSync(envPath)) return;

    const content = readFileSync(envPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const separator = line.indexOf("=");
        if (separator <= 0) continue;

        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();

        if (
            (value.startsWith('"' && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

/**
 * Run once (or idempotently) to create required MongoDB indexes.
 * Execute from the repo root: npm run setup:indexes
 * Or from the api workspace: npm run setup-indexes
 * Reads environment variables from api/.env automatically.
 */
async function setupIndexes() {
    loadEnvFile();

    const db = await getDb();
    const users = db.collection("users");

    // Unique index on email (case-insensitive lookup)
    await users.createIndex(
        {email: 1},
        {unique: true, name: "email_unique"},
    );

    // TTL index: auto-delete unverified users whose verification token has expired
    // MongoDB will remove documents where verificationTokenExpiry has passed
    await users.createIndex(
        {verificationTokenExpiry: 1},
        {
            expireAfterSeconds: 0,
            partialFilterExpression: {isVerified: false},
            name: "verification_ttl",
        },
    );

    // Sparse index on resetToken for fast lookup
    await users.createIndex(
        {resetToken: 1},
        {sparse: true, name: "reset_token_sparse"},
    );

    // Sparse index on verificationToken for fast lookup
    await users.createIndex(
        {verificationToken: 1},
        {sparse: true, name: "verification_token_sparse"},
    );

    // Role + activity status
    await users.createIndex({role: 1, isActive: 1}, {name: "role_isActive"});
    await users.createIndex({lastLoginAt: -1}, {name: "lastLogin_desc", sparse: true});

    // Activity log
    const activity = db.collection("activity_log");
    await activity.createIndex({actorId: 1, createdAt: -1}, {name: "actor_recent"});
    await activity.createIndex({targetType: 1, targetId: 1}, {name: "target_lookup"});
    await activity.createIndex({createdAt: -1}, {name: "recent"});

    // Question flags
    const flags = db.collection("question_flags");
    await flags.createIndex({questionId: 1, status: 1}, {name: "question_status"});
    await flags.createIndex({userId: 1}, {name: "by_user"});
    await flags.createIndex({status: 1, createdAt: -1}, {name: "status_recent"});

    // Announcements
    const announcements = db.collection("announcements");
    await announcements.createIndex(
        {isActive: 1, startsAt: 1, expiresAt: 1},
        {name: "active_window"},
    );

    // Questions: support admin filtering & soft-deletes
    const questions = db.collection("questions");
    await questions.createIndex({isDeleted: 1, subjectArea: 1, difficulty: 1}, {name: "admin_filters"});
    await questions.createIndex(
        {setId: 1, isDeleted: 1, publicationStatus: 1, subjectArea: 1, difficulty: 1},
        {name: "set_selection"},
    );
    await questions.createIndex({flagCount: -1}, {name: "flag_count_desc"});
}
await questions.createIndex(
    { publicationStatus: 1, isDeleted: 1, subjectArea: 1, difficulty: 1 },
    { name: "published_selection" },
);
await questions.createIndex({ dedupFingerprint: 1 }, { name: "dedup_fingerprint" });
await questions.createIndex({ publicationStatus: 1, updatedat: -1 }, { name: "workflow_recent" });

const questionVersions = db.collection("question_versions");
await questionVersions.createIndex({ questionId: 1, version: -1 }, { name: "question_version_recent" });

const questionImportBatches = db.collection("question_import_batches");
await questionImportBatches.createIndex({ createdBy: 1, createdAt: -1 }, { name: "creator_recent" });
await questionImportBatches.createIndex(
    { expiresAt: 1 },
    { name: "batch_expiry_ttl", expireAfterSeconds: 0 },
);

const questionMediaAssets = db.collection("question_media_assets");
await questionMediaAssets.createIndex(
    { sha256: 1, size: 1 },
    { name: "media_dedup_hash_size", unique: true },
);
await questionMediaAssets.createIndex({ isDeleted: 1, createdAt: -1 }, { name: "media_active_recent" });

// Help center / onboarding / contextual help
const helpArticles = db.collection("help_articles");
await helpArticles.createIndex({ slug: 1 }, { unique: true, name: "slug_unique" });
await helpArticles.createIndex({ category: 1, order: 1 }, { name: "category_order" });
await helpArticles.createIndex({ status: 1, category: 1 }, { name: "status_category" });
await helpArticles.createIndex({ contextualHelpIds: 1 }, { name: "contextual_ids" });
await helpArticles.createIndex(
    { title: "text", subtitle: "text", content.body": "text" },
    { name: "help_text_search" },
);

const contextualHelp = db.collection("contextual_help");
await contextualHelp.createIndex({ page: 1, isActive: 1, order: 1 }, { name: "page_active_order" });

const onboardingFlows = db.collection("onboarding_flows");
await onboardingFlows.createIndex({_id: 1}, {unique: true, name: "flow_id_unique"});
await onboardingFlows.createIndex({triggerCondition: 1, isActive: 1}, {name: "trigger_active"});

const helpFeedback = db.collection("help_feedback");
await helpFeedback.createIndex({articleSlug: 1, createdAt: -1}, {name: "article_recent"});
await helpFeedback.createIndex({helpful: 1, createdAt: -1}, {name: "helpful_recent"});

const helpSearchAnalytics = db.collection("help_search_analytics");
await helpSearchAnalytics.createIndex({term: 1}, {unique: true, name:"term_unique"});

// Exam sessions: dashboards & monitor
await db.collection("exam_sessions").createIndex(
    { status: 1, startedAt: -1 },
    { name: "status_started" },
);
await db.collection("exam_sessions").createIndex(
    { userId: 1, setId: 1, createdAt: -1 },
    { name: "user_set_recent" },
);

// Question set assignment balancing
const questionSets = db.collection("question_sets");
await questionSets.createIndex({ setId: 1}, {unique: true, name:"set_id_unique"});
await questionSets.createIndex(
    { isActive: 1, assignmentCount: 1, updatedAt: 1},
    {name: "active_assignment_distribution"},
);

const examSetAssignments = db.collection("exam_set_assignments");
await examSetAssignments.createIndex(
    { userId: 1, setId: 1 },
    {unique: true, name:"user_set_unique"},
);
await examSetAssignments.createIndex(
    { userId: 1, lastAssignedAt: -1},
    {name: "user_set_recent"},
);

// Contact messages: open/closed status
await db.collection("contact_messages").createIndex(
    { status: 1, createdAt: -1 },
    { name: "status_recent" },
);

// Social login: linked identities
const identities = db.collection("user_identities");
await identities.createIndex(
    { provider: 1, providerUserId: 1},
    {unique: true, name:"provider_subject_unique"},
);
await identities.createIndex(
    { userId: 1, provider: 1 },
    {unique: true, name:"user_provider_unique"},
);
await identities.createIndex({userId: 1}, {name:"by_user"});

// OAuth state (CSRF) with 10-minute TTL
const oauthState = db.collection("oauth_state");
await oauthState.createIndex({state: 1}, {unique: true, name:"state_unique"});
await oauthState.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "state_ttl" },
);
const providerSettings = db.collection("auth_provider_settings");
await providerSettings.createIndex({ updatedAt: -1 }, { name: "recent" });

// ─── Account deletion tombstones ──────────────
await db.collection("deletion_log").createIndex(
    { deletedAt: -1 },
    { name: "deleted_recent" },
);

// ─── Phase 11: recovery codes (one document per user) ───
const recovery = db.collection("recovery_codes");
await recovery.createIndex({ userId: 1 }, { unique: true, name: "user_unique" });

// ─── Phase 11: support tickets ──────────────
const tickets = db.collection("support_tickets");
await tickets.createIndex({ ticketNumber: 1 }, { unique: true, name: "ticket_number_unique" });
await tickets.createIndex({ userId: 1, status: 1 }, { name: "user_status", sparse: true });
await tickets.createIndex(
    { status: 1, priority: -1, createdAt: 1 },
    { name: "queue_priority" },
);
await tickets.createIndex(
    { assignedTo: 1, status: 1 },
    { name: "assignee_status", sparse: true },
);
await tickets.createIndex({ requesterEmail: 1 }, { name: "requester_email" });
await tickets.createIndex({ verification.status: 1 }, { name: "verification_status" });

// ─── Phase 11: data requests (export / deletion) ──────────────
const dataRequests = db.collection("data_requests");
await dataRequests.createIndex(
    { userId: 1, type: 1, status: 1 },
    { name: "user_type_status" },
);
await dataRequests.createIndex({ status: 1, type: 1 }, { name: "status_type" });
await dataRequests.createIndex(
    { "deletion.scheduledFor": 1 },
    { name: "scheduled_deletion", sparse: true },
);
await dataRequests.createIndex(
    { "export.expiresAt": 1 },
    { name: "export_expiry", sparse: true },
);

// ─── Phase 11: identity disputes ──────────────
const disputes = db.collection("identity_disputes");
await disputes.createIndex(
    { supportTicketId: 1 },
    { unique: true, name: "ticket_unique" },
);
await disputes.createIndex({ currentOwnerUserId: 1 }, { name: "by_owner" });
await disputes.createIndex({ status: 1 }, { name: "by_status" });

// ─── Phase 11: deletion-log (extended schema) ──────────────
await db.collection("deletion_log").createIndex({ emailHash: 1 }, { name: "email_hash_lookup" });
await db.collection("deletion_log").createIndex({ executedAt: -1 }, { name: "executed_recent" });

// ─── Phase 12: gamification ──────────────
const xpTx = db.collection("xp_transactions");
await xpTx.createIndex({ userId: 1, createdAt: -1 }, { name: "user_recent" });
await xpTx.createIndex({ createdAt: -1 }, { name: "leaderboard_window" });

const achievements = db.collection("achievements_catalog");
await achievements.createIndex({ id: 1 }, { unique: true, name: "id_unique" });
await achievements.createIndex({ isActive: 1, category: 1 }, { name: "active_by_category" });

const challenges = db.collection("weekly_challenges_catalog");
await challenges.createIndex({ id: 1 }, { unique: true, name: "id_unique" });
await challenges.createIndex({ isActive: 1 }, { name: "active" });

// gamification block lives on users - index XP for fast leaderboard sort
await db.collection("users").createIndex(
    { "gamification.xp": -1 },
    { name: "gamification_xp_desc", partialFilterExpression: { isActive: true } },
);

// ─── Phase 13: spaced repetition practice ──────────────
const practiceCards = db.collection("practice_cards");
await practiceCards.createIndex(
    { userId: 1, questionId: 1 },
    { unique: true, name: "user_question_unique" },
);
await practiceCards.createIndex(
    { userId: 1, status: 1, nextReviewDate: 1 },
    { name: "user_status_due" },
);
await practiceCards.createIndex(
    { userId: 1, subjectArea: 1, status: 1 },
    { name: "user_subject_status" },
);

const practiceSessions = db.collection("practice_sessions");
await practiceSessions.createIndex(
    { userId: 1, startedAt: -1 },
    { name: "user_recent_sessions" },
);
await practiceSessions.createIndex(
    {userId: 1, status: 1, completedAt: -1},
    {name: "user_status_completed"},
);

// ─ Phase 14: push notifications ─
const pushSubs = db.collection("push_subscriptions");
await pushSubs.createIndex({endpoint: 1}, {unique: true, name: "endpoint_unique"});
await pushSubs.createIndex({userId: 1}, {name: "by_user"});
await pushSubs.createIndex(
    {"preferences.daily_reminder": 1},
    {name: "daily_reminder_filter"},
);
await pushSubs.createIndex(
    {"preferences.streak_alert": 1},
    {name: "streak_alert_filter"},
);

// ─ Phase 15: security hardening ─
const rateBuckets = db.collection("rate_limit_buckets");
await rateBuckets.createIndex(
    {updatedAt: -1},
    {name: "ttl_inactive", expireAfterSeconds: 86_400},
);

const ipIntel = db.collection("ip_intelligence");
await ipIntel.createIndex(
    {reputation: 1, threatScore: -1},
    {name: "by_reputation_score"},
);
await ipIntel.createIndex(
    {"activity.lastSeenAt": -1},
    {name: "by_last_seen"},
);
await ipIntel.createIndex({country: 1}, {name: "by_country"});

const secEvents = db.collection("security_events");
await secEvents.createIndex({timestamp: -1}, {name: "by_time"});
await secEvents.createIndex(
    {type: 1, timestamp: -1},
    {name: "by_type_time"},
);
await secEvents.createIndex(
    {severity: 1, reviewed: 1},
    {name: "triage_queue"},
);
await secEvents.createIndex(
    {"source.ip": 1, timestamp: -1},
    {name: "by_ip_time"},
);
await secEvents.createIndex(
    {"source.userId": 1, timestamp: -1},
    {name: "by_user_time"},
);
await secEvents.createIndex(
    {timestamp: 1},
    {name: "ttl_retention", expireAfterSeconds: 7_776_000},
);

const blocked = db.collection("blocked_entities");
await blocked.createIndex(
    {type: 1, value: 1, isActive: 1},
    {name: "lookup"},
);
await blocked.createIndex(
    {isActive: 1, type: 1},
    {name: "active_by_type"},
);
await blocked.createIndex(
    {expiresAt: -1},
    {name: "by_expiry", sparse: true},
);

const userSessions = db.collection("user_sessions");
await userSessions.createIndex(
    {userId: 1, lastActiveAt: -1},
    {name: "user_recent_sessions"},
);
await userSessions.createIndex(
    {jti: 1}, {unique: true, name: "jti_unique"});
await userSessions.createIndex(
    {lastActiveAt: 1},
    {name: "ttl_stale", expireAfterSeconds: 2_592_000 /*30 days*/},
);

const captchaChallenges = db.collection("captcha_challenges");
await captchaChallenges.createIndex(
    {expiresAt: 1},
    {name: "ttl_expiry", expireAfterSeconds: 0},
);

// ─ Phase 16: payments / subscriptions ─
await db.collection("payment_config").createIndex({_id: 1}, {name: "singleton_id"});
const paymentSubmissions = db.collection("payment_submissions");
await paymentSubmissions.createIndex(
    {submissionNumber: 1},
    {unique: true, name: "submission_number_unique"},
);
await paymentSubmissions.createIndex(
    {userId: 1, status: 1, createdAt: -1},
    {name: "user_status_recent"},
);
{status:1,createdAt:1},
{name:"status_created"},
);
await paymentSubmissions.createIndex(
{expiresAt:-1},
{name:"expires_ttl", expireAfterSeconds:0},
);

const pangmeryendaTx = db.collection("pangmeryenda_transactions");
await pangmeryendaTx.createIndex(
{pangmeryendaTransactionId:1},
{unique:true,name:"pangmeryenda_tx_unique"},
);
await pangmeryendaTx.createIndex(
{userId:1,status:1},
{name:"pangmeryenda_user_status"},
);
await pangmeryendaTx.createIndex(
{status:1,createdAt:-1},
{name:"pangmeryenda_status_created"},
);

const promoCodes = db.collection("promo_codes");
await promoCodes.createIndex({code:1},{unique:true,name:"promo_code_unique"});
await promoCodes.createIndex(
{isActive:1,validFrom:1,validUntil:1},
{name:"promo_validity"},
);

const channelLog = db.collection("channel_transactions_log");
await channelLog.createIndex({channelId:1,date:1},{name:"channel_date"});
await channelLog.createIndex({channelId:1,month:1},{name:"channel_month"});

await users.createIndex(
{"subscription.tier":1,"subscription.premium.endDate":1},
{name:"subscription_expiry_lookup",sparse:true},
);

// Study Plan domain
const studyPlans = db.collection("study_plans");
await studyPlans.createIndex({userId:1,status:1},{name:"study_user_status"});
await studyPlans.createIndex(
{userId:1,"schedule.nextSessionDate":1},
{name:"study_user_next_session"},
);

const studyLessons = db.collection("study_lessons");
await studyLessons.createIndex(
{subjectArea:1,subtopic:1},
{name:"study_lesson_subject_subtopic"},
);
await studyLessons.createIndex(
{status:1,subjectArea:1},
{name:"study_lesson_status_subject"},
);

const studyTemplates = db.collection("study_plan_templates");
await studyTemplates.createIndex({status:1},{name:"study_templates_status"});

const studyAssessments = db.collection("study_plan_assessments");
await studyAssessments.createIndex(
{userId:1,studyPlanId:1,moduleId:1},
{name:"study_assessment_user_plan_module"},
);
await studyAssessments.createIndex(
{userId:1,createdAt:-1},
{name:"study_assessment_user_recent"},
);

const diagnosticTests = db.collection("diagnostic_tests");
await diagnosticTests.createIndex(
{userId:1,status:1},
{name:"diagnostic_user_status"},
);

// Monitoring domain
const logs = db.collection("application_logs");
await logs.createIndex({timestamp:-1},{name:"logs_recent"});
await logs.createIndex({level:1,timestamp:-1},{name:"logs_level_recent"});
await logs.createIndex({"context.service":1,timestamp:-1},{name:"logs_service_recent"});
await logs.createIndex(
{timestamp:1},
{name:"logs_ttl_90d",expireAfterSeconds:7_776_000},
);

const metrics = db.collection("metrics");
await metrics.createIndex({name:1,timestamp:-1},{name:"metrics_name_time"});
await metrics.createIndex({bucket:1,name:1},{name:"metrics_bucket_name"});
await metrics.createIndex({timestamp:1},{name:"metrics_ttl_30d",expireAfterSeconds:2_592_000});

const alerts = db.collection("alerts");
await alerts.createIndex({alertId:1},{unique:true,name:"alerts_id_unique"});
await alerts.createIndex({status:1,severity:1,firedAt:-1},{name:"alerts_triage"});
await alerts.createIndex({"source.ruleId":1,status:1},{name:"alerts_rule_open"});
await alerts.createIndex({"source.checkId":1,status:1},{name:"alerts_check_open"});

const alertRules = db.collection("alert_rules");
await alertRules.createIndex({ruleId:1},{unique:true,name:"alert_rules_id_unique"});
await alertRules.createIndex({isActive:1,severity:1},{name:"alert_rules_active"});

const healthChecks = db.collection("health_checks");
await healthChecks.createIndex({checkId:1},{unique:true,name:"health_checks_id_unique"});
await healthChecks.createIndex({currentStatus:1,updatedAt:-1},{name:"health_checks_status_recent"});
const monitoringConfig = db.collection("monitoring_config");
await monitoringConfig.createIndex({_id: 1}, {unique: true, name: "monitoring_config_singleton"});
console.log("MongoDB indexes created successfully.");
process.exit(0);
}

setupIndexes().catch((err) => {
    console.error("Failed to create indexes:", err);
    process.exit(1);
});