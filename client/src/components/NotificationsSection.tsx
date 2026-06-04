/**
 * Phase 14 -- Notifications settings section.
 *
 * Rendered inside SettingsPage. Lets the user:
 *   - Enable push notifications on this device.
 *   - Toggle per-type preferences for each registered subscription.
 *   - Set the daily reminder time (HH:mm, local).
 *   - Disable push on this device (unsubscribe locally + server-side).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PUSH_PREFERENCES,
  PUSH_NOTIFICATION_TYPES,
  type PushPreferences,
  type PushPreferencesResponse,
} from "@upcat/shared";
import { pushApi } from "@/lib/pushApi";
import { disablePushOnThisDevice, ensurePushSubscription, isPushCapable } from "@/lib/pwa";
import { useToastStore } from "@/stores/toastStore";
import Spinner from "@/components/Spinner";

const TYPE_LABELS: Record<keyof PushPreferences, { label: string; help: string }> = {
  daily_reminder: {
    label: "Daily reminder",
    help: "A nudge each day at your chosen time to keep your streak alive.",
  },
  streak_alert: {
    label: "Streak alerts",
    help: "Warn me in the evening if I'm about to lose my streak.",
  },
  achievement: {
    label: "Achievements",
    help: "Celebrate when I unlock a new badge or level up.",
  },
  weekly_challenge: {
    label: "Weekly challenges",
    help: "Let me know when a new challenge is available.",
  },
  announcement: {
    label: "Announcements",
    help: "Important updates from the team.",
  },
};

type Subscription = PushPreferencesResponse["subscriptions"][number];

export default function NotificationsSection() {
  const addToast = useToastStore((s) => s.addToast);
  const supported = isPushCapable();
  const [permission, setPermission] = useState<NotificationPermission | "unknown">(
    typeof Notification !== "undefined" ? Notification.permission : "unknown",
  );
  const [subs, setSubs] = useState<Subscription[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);

  const reload = useCallback(async () => {
    try {
      const data = await pushApi.preferences();
      setSubs(data.subscriptions);
    } catch {
      setSubs([]);
    }
  }, []);

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, [supported, reload]);

  const onEnable = async () => {
    setEnabling(true);
    try {
      const result = await ensurePushSubscription();
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
      switch (result.status) {
        case "ok":
          addToast("success", "Notifications enabled on this device.");
          await reload();
          break;
        case "denied":
          addToast("error", result.message ?? "Notifications are blocked. Update your browser settings.");
          break;
        case "unsupported":
          addToast("error", "Your browser does not support push notifications.");
          break;
        case "no-public-key":
          addToast("error", "Push is not configured on the server yet.");
          break;
        default:
          addToast("error", result.message ?? "Could not enable notifications.");
      }
    } finally {
      setEnabling(false);
    }
  }
}
const onDisableDevice = async () => {
    if (!confirm("Disable notifications on this device?")) return;
    const ok = await disablePushOnThisDevice();
    if (ok) {
        addToast("success", "Notifications disabled on this device.");
        await reload();
    } else {
        addToast("info", "No active subscription on this device.");
    }
};

const onTogglePref = async (sub: Subscription, key: keyof PushPreferences, value: boolean) => {
    const prev = subs;
    setSubs((curr) => {
        curr
            ? curr.map((s) => {
                s.subscriptionId === sub.subscriptionId
                    ? {...s, preferences: {...s.preferences, [key]: value}}
                    : s;
            })
            : curr;
    });
    try {
        await pushApi.updatePreferences({
            endpoint: sub.endpoint,
            preferences: {[key]: value},
        });
    } catch {
        addToast("error", "Could not update preference.");
        setSubs(prev);
    }
};

const onReminderTimeChange = async (sub: Subscription, reminderTime: string) => {
    if (!/^d2:d2$/.test(reminderTime)) return;
    const prev = subs;
    setSubs((curr) => {
        curr
            ? curr.map((s) => {
                s.subscriptionId === sub.subscriptionId
                    ? {...s, reminderTime}
                    : s;
            })
            : curr;
    });
    try {
        await pushApi.updatePreferences({endpoint: sub.endpoint, reminderTime});
    } catch {
        addToast("error", "Could not update reminder time.");
        setSubs(prev);
    }
};

if (!supported) {
    return (
        <p className="text-sm text-gray-500">
            Push notifications are not supported in this browser.
        </p>
    );
}
if (loading) return <Spinner/>;

const hasAny = (subs?.length ?? 0) > 0;

return (
    <div className="space-y-4">
        {hasAny && (
            <div className="rounded-lg border border-primary-100 bg-primary-50/50 p-4">
                <p className="text-sm text-primary-900">
                    Get a gentle daily nudge, streak warnings, and achievement alerts -- even when the app is closed.
                </p>
                {permission === "denied" ? (
                    <p className="mt-2 text-xs text-red-700">
                        Notifications are blocked. Update your browser site settings, then try again.
                    </p>
                ) : null}
                <button
                    type="button"
                    onClick={onEnable}
                    disabled={enabling || permission === "denied"}
                    className="btn-primary mt-3 disabled:opacity-50"
                >
                    {enabling ? "Enabling..." : "Enable notifications"}
                </button>
            </div>
        )}

        {hasAny && (
            <ul className="space-y-4">
                {subs!.map((sub) => (
                    <SubscriptionRow
                        key={sub.subscriptionId}
                        sub={sub}
                        onToggle={onTogglePref}
                        onReminderChange={onReminderTimeChange}
                    />
                ))}
            </ul>
        )}

        {hasAny && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
type="button"
onClick={onEnable}
disabled={enabling}
className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
>
  {enabling ? "Working..." : "Re-enable on this device"}
</button>
<button
type="button"
onClick={onDisableDevice}
className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
>
  Disable on this device
</button>
</div>
</div>
);
}

function SubscriptionRow({
  sub,
  onToggle,
  onReminderChange,
  onToggle,
  onReminderChange: (s: Subscription, k: keyof PushPreferences, v: boolean) => void;
  onReminderChange: (s: Subscription, time: string) => void;
}) {
  const deviceLabel = useMemo(() => describeUserAgent(sub.userAgent), [sub.userAgent]);
  const prefs = {...DEFAULT_PUSH_PREFERENCES, ...sub.preferences};

  return (
    <li className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{deviceLabel}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Registered {new Date(sub.createdAt).toLocaleDateString()}
            {sub.timezone ? ` ${sub.timezone}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Last used {new Date(sub.lastUsedAt).toLocaleDateString()}
            {sub.timezone ? ` ${sub.timezone}` : ""}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PUSH_NOTIFICATION_TYPES.map((key) => {
            const meta = TYPE_LABELS[key];
            return (
              <label key={key} className="flex items-start gap-2 rounded-md border border-transparent p-2 hover:border-gray-200">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  checked={prefs[key]}
                  onChange={(e) => onToggle(sub, key, e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-900">{meta.label}</span>
                  <span className="block text-xs text-gray-500">{meta.help}</span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <label htmlFor={`reminder-${sub.subscriptionId}`} className="text-xs font-medium text-gray-700">
            Daily reminder time
          </label>
          <input
            id={`reminder-${sub.subscriptionId}`}
            type="time"
            value={sub.reminderTime}
            onChange={(e) => onReminderChange(sub, e.target.value)}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            disabled={!prefs.daily_reminder}
          />
        </div>
      </div>
    </li>
  );
}

function describeUserAgent(ua: string | null): string {
  if (!ua) return "This device";
  // Cheap heuristic - good enough for self-recognition.
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS device";
  if (/Android/i.test(ua)) return "Android device";
  if (/Windows/i.test(ua)) return "Windows device";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS device";
  if (/Linux/i.test(ua)) return "Linux device";
  return "Browser";
}