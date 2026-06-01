import { type } from "mongodb";

interface MaintenanceStateDoc {
  _id: "global";
  isActive: boolean;
  activeWindowId: ObjectId | null;
  forceMaintenanceMode: boolean;
  forceMaintenanceMessage: string | null;
  estimatedReturn: Date | null;
  updatedAt: Date;
}

export type MaintenanceStatus = "scheduled" | "warning" | "active" | "extending" | "completed" | "cancelled";

export interface MaintenanceWindowDoc {
  _id: ObjectId;
  title: string;
  description: string;
  internalNotes: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  estimatedDuration: number;
  actualStart: Date | null;
  actualEnd: Date | null;
  status: MaintenanceStatus;
  config: {
    type: "full" | "partial" | "read_only";
    affectedServices: string[];
    advanceNoticeMinutes: number;
    showCountdown: boolean;
    sessionHandling: {
      allowActiveExamsToFinish: boolean;
      extendExamTimers: boolean;
      extensionMinutes: number;
      gracePeriodMinutes: number;
      pauseServerDeadlines: boolean;
      blockNewSessions: number;
    };
    messaging: {
      bannerMessage: string;
      maintenancePageTitle: string;
      maintenancePageMessage: string;
      estimatedReturnMessage: string;
      showProgress: boolean;
      allowEmailNotify: boolean;
    };
    autoStart: boolean;
    autoEnd: boolean;
    requireManualEnd: boolean;
  };
  notifications: {
    advanceNoticeSent: boolean;
    advanceNoticeSentAt: Date | null;
    startNotificationSent: boolean;
    endNotificationSent: boolean;
    affectedUserCount: number | null;
  };
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function defaultMaintenanceConfig() {
  return {
    type: "full" as const,
    affectedServices: ["all"],
    advanceNoticeMinutes: Number(process.env.MAINTENANCE_ADVANCE_NOTICE_DEFAULT || "60"),
    showCountdown: true,
    sessionHandling: {
      allowActiveExamsToFinish: true,
      extendExamTimers: true,
      extensionMinutes: Number(process.env.MAINTENANCE_TIMER_EXTENSION_DEFAULT || "15"),
      gracePeriodMinutes: Number(process.env.MAINTENANCE_GRACE_PERIOD_DEFAULT || "30"),
      pauseServerDeadlines: true,
      blockNewSessions: 5,
    },
    messaging: {
      bannerMessage: "Scheduled maintenance is coming soon.",
      maintenancePageTitle: "We'll Be Right Back",
      maintenancePageMessage: "We're performing scheduled maintenance.",
      estimatedReturnMessage: "We'll be back shortly.",
      showProgress: false,
      allowEmailNotify: true,
    },
    autoStart: true,
    autoEnd: true,
    requireManualEnd: false,
  };
}

export async function getActiveMaintenanceWindow(db: Db): Promise<MaintenanceWindowDoc | null> {
  const now = new Date();
  const active = await db.collection<MaintenanceWindowDoc>("maintenance_windows").findOne({
    status: {$in: ["active", "extending"]},
    scheduledStart: {$lte: now},
    scheduledEnd: {$gte: new Date(now.getTime() - 10 * 60_000)},
  }).as never, {sort: {scheduledStart: -1}});
  if (active) return active;

  const state = await db.collection<MaintenanceStateDoc>("maintenance_state").findOne({_id: "global"});
  if (state?.forceMaintenanceMode) {
    const synthetic = MaintenanceWindowDoc = {
      _id: new ObjectId(),
      title: "Emergency Maintenance",
description: state.forceMaintenanceMessage || "Maintenance in progress",
internalNotes: null,
scheduledStart: now,
scheduledEnd: state.estimatedReturn || new Date(now.getTime() + 30 * 60_000),
estimatedDuration: 30,
actualStart: now,
actualEnd: null,
status: "active",
config: defaultMaintenanceConfig(),
notifications: {
advanceNoticeSent: true,
advanceNoticeSentAt: now,
startNotificationSent: true,
endNotificationSent: false,
affectedUserCount: null,
},
createdBy: new ObjectId("000000000000000000000001"),
createdAt: now,
updatedAt: now,
};
return synthetic;
}

return null;
}

export async function getUpcomingMaintenanceWindow(db: Db): Promise<MaintenanceWindowDoc> | null> {
const now = new Date();
return db.collection<MaintenanceWindowDoc>("maintenance_windows").findOne({
status: {$in: ["scheduled", "warning"]},
scheduledStart: {$gt: now},
} as never, {sort: {scheduledStart: 1}});
}

export async function activateMaintenanceWindow(db: Db, id: ObjectId): Promise<{
activeSessions: number;
sessionsExtended: number
}> {
const now = new Date();
const win = await db.collection<MaintenanceWindowDoc>("maintenance_windows").findOne({_id: id});
if (!win) throw new Error("Maintenance window not found");
if (!["scheduled", "warning"] as MaintenanceStatus[]).includes(win.status)) {
throw new Error(`Maintenance window cannot be activated from status ${win.status}`);
}
const extensionMs = win.config.sessionHandling.extendExamTimers
? win.config.sessionHandling.extensionMinutes * 60_000
: 0;

let sessionsExtended = 0;
let activeSessions = 0;
if (win.config.sessionHandling.allowActiveExamsToFinish) {
const active = await db.collection("exam_sessions").find({status: "in_progress"}).project({_id: 1}).toArray();
activeSessions = active.length;
if (extensionMs > 0 && active.length > 0) {
const ids = active.map((s) => s._id);
const upd = await db.collection("exam_sessions").updateMany({
_id: {$in: ids}},
{
push: {
timerAdjustments: {
reason: "maintenance_extension",
additionalMs: extensionMs,
appliedAt: now,
appliedBy: "system",
},
},
as never,
});
sessionsExtended = upd.modifiedCount;
}
}

const activated = await db.collection<MaintenanceWindowDoc>("maintenance_windows").updateOne({
_id: id, status: {$in: ["scheduled", "warning"]} as never},
{
set: {
status: "active",
actualStart: now,
updatedAt: now,
"notifications.startNotificationSent": true,
},
},
);
if (activated.modifiedCount === 0) {
throw new Error("Maintenance window activation conflict");
}
await db.collection<MaintenanceStateDoc>("maintenance_state").updateOne({
_id: "global"},
{
set: {
_id: "global",
isActive: true,
activeWindowId: id,
forceMaintenanceMode: false,
forceMaintenanceMessage: null,
estimatedReturn: win.scheduledEnd,
updatedAt: now,
},
},
{
upsert: true,
});
return {activeSessions, sessionsExtended};
}

export async function completeMaintenanceWindow(db: Db, id: ObjectId): Promise<void> {
  const now = new Date();
  await db.collection<MaintenanceWindowDoc>("maintenance_windows").updateOne(
    {_id: id},
    {
      $set: {
        status: "completed",
        actualEnd: now,
        updatedAt: now,
        "notifications.endNotificationSent": true,
      },
    },
  );

  await db.collection<MaintenanceStateDoc>("maintenance_state").updateOne(
    {_id: "global"},
    {
      $set: {
        _id: "global",
        isActive: false,
        activeWindowId: null,
        forceMaintenanceMode: false,
        forceMaintenanceMessage: null,
        estimatedReturn: null,
        updatedAt: now,
      },
    },
    {upsert: true},
  );
}

export async function buildMaintenanceStatus(db: Db) {
  const active = await getActiveMaintenanceWindow(db);
  const upcoming = await getUpcomingMaintenanceWindow(db);

  const now = Date.now();
  const showBanner = Boolean(upcoming && upcoming.scheduledStart.getTime() - now <= upcoming.config.advanceNoticeMinutes * 60_000);

  return {
    isActive: Boolean(active),
    currentWindow: active
  } ? {
    _id: active._id,
    title: active.title,
    description: active.description,
    scheduledStart: active.scheduledStart,
    scheduledEnd: active.scheduledEnd,
    estimatedReturn: active.scheduledEnd,
    type: active.config.type,
    status: active.status,
    messaging: active.config.messaging,
    sessionHandling: active.config.sessionHandling,
    actualStart: active.actualStart,
  } : null;
  upcoming: upcoming
} ? {
    _id: upcoming._id,
    title: upcoming.title,
    description: upcoming.description,
    scheduledStart: upcoming.scheduledStart,
    scheduledEnd: upcoming.scheduledEnd,
    advanceNoticeMinutes: upcoming.config.advanceNoticeMinutes,
    messaging: upcoming.config.messaging,
  } : null;
  showBanner,
  bannerMessage: active?.config.messaging.bannerMessage || upcoming?.config.messaging.bannerMessage || null,
  countdownTo: active?.scheduledEnd || upcoming?.scheduledStart || null,
};
}