import {useEffect, useState} from "react";
import Spinner from "@/components/Spinner";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";
import type {PlatformSettings} from "@upcat/shared";
import {DEFAULT_PLATFORM_SETTINGS} from "@upcat/shared";

function normalizeSettings(input: PlatformSettings): PlatformSettings {
  const rawDistribution = (input.examDefaults?.distribution ?? {}).as Record<string, unknown>;
  const distribution = Object.fromEntries(
    Object.entries(DEFAULT_PLATFORM_SETTINGS.examDefaults.distribution).map(([subject, defaults]) => {
      const raw = rawDistribution[subject];
      if (raw && typeof raw === "object") {
        const cfg = raw as Partial<{ questions: number; timeLimit: number }>;
        return [
          subject,
          ...
        ];
      }
      if (typeof raw === "number" && Number.isFinite(cfg.questions) ? Number(cfg.questions) : defaults.questions,
      ...
      timeLimit: Number.isFinite(cfg.timeLimit) ? Number(cfg.timeLimit) : defaults.timeLimit,
      ...
    });
  }).as PlatformSettings["examDefaults"]["distribution"];

  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...input,
    examDefaults: {
      distribution,
      difficultyMix: {
        ...DEFAULT_PLATFORM_SETTINGS.examDefaults.difficultyMix,
        ...(input.examDefaults?.difficultyMix ?? {}),
      },
    },
    registration: {
      ...DEFAULT_PLATFORM_SETTINGS.registration,
      ...(input.registration ?? {}),
    },
    leaderboard: {
      ...DEFAULT_PLATFORM_SETTINGS.leaderboard,
      ...(input.leaderboard ?? {}),
    },
    maintenance: {
      ...DEFAULT_PLATFORM_SETTINGS.maintenance,
      ...(input.maintenance ?? {}),
    },
    contact: {
      ...DEFAULT_PLATFORM_SETTINGS.contact,
      ...(input.contact ?? {}),
    },
    scoring: {
      ...DEFAULT_PLATFORM_SETTINGS.scoring,
      ...(input.scoring ?? {}),
    },
  }).as PlatformSettings;
}

export default function AdminSettingsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const loaded = await adminApi.getSettings();
        setSettings(normalizeSettings(loaded));
      } catch (e) {
        const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
        addToast("error", msg ?? "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await adminApi.saveSettings(settings);
      setSettings(normalizeSettings(next));
      addToast("success", "Settings saved.");
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast("error", msg ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!settings) return null;

  const set = (path: string, value: unknown) => {
    setSettings((s) => {
      if (!s) return s;
      const copy = JSON.parse(JSON.stringify(s)) as PlatformSettings & Record<string, unknown>;
const segs = path.split(".");
let cur: Record<string, unknown> = copy as unknown as Record<string, unknown>;
for (let i = 0; i < segs.length - 1; i++) {
    const key = segs[i]!
    const next = cur[key];
    if (!next || typeof next !== "object") || Array.isArray(next)) {
        cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
}
cur[segs[segs.length - 1]] = value;
return copy;
});
};

return (
<div className="space-y-6">
<Section title="Registration">
<Toggle label="Open for new sign-ups" checked={settings.registration.isOpen}>
    onChange={(v) => set("registration.isOpen", v)} />
<Toggle label="Require email verification" checked={settings.registration.requireEmailVerification}>
    onChange={(v) => set("registration.requireEmailVerification", v)} />
<Toggle label="Allow sign-up by email/password" checked={settings.registration.allowEmailSignup}>
    onChange={(v) => set("registration.allowEmailSignup", v)} />
<p className="text-xs text-slate-500">
When disabled, at least one social login provider must be enabled in Auth Providers.
</p>
</Section>

<Section title="Maintenance">
<Toggle label="Maintenance mode enabled" checked={settings.maintenance.isEnabled}>
    onChange={(v) => set("maintenance.isEnabled", v)} />
<Field label="Banner message">
    <textarea rows={3} value={settings.maintenance.message}>
        onChange={(e) => set("maintenance.message", e.target.value)}
    </textarea>
    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"/>
</Field>
</Section>

<Section title="Leaderboard">
<Toggle label="Leaderboard enabled" checked={settings.leaderboard.isEnabled}>
    onChange={(v) => set("leaderboard.isEnabled", v)} />
<Toggle label="Show full names" checked={settings.leaderboard.showFullName}>
    onChange={(v) => set("leaderboard.showFullName", v)} />
</Section>

<Section title="Exam Scoring System">
<p className="mb-3 text-xs text-slate-500">Configure how exam scores are calculated</p>
<div className="grid-grid-cols-3 gap-3">
<Field label="Points per correct answer">
<input type="number" step={0.25} value={settings.scoring.correct}>
    onChange={(e) => set("scoring.correct", Number(e.target.value))}
    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/>
</Field>
<Field label="Points per incorrect answer">
<input type="number" step={0.25} value={settings.scoring.incorrect}>
    onChange={(e) => set("scoring.incorrect", Number(e.target.value))}
    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/>
</Field>
<Field label="Points per unanswered">
<input type="number" step={0.25} value={settings.scoring.unanswered}>
    onChange={(e) => set("scoring.unanswered", Number(e.target.value))}
    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/>
</Field>
</div>
<p className="mt-3 text-xs text-slate-500">Score percentage = (raw score / max possible score) * 100,
where max = correct answers * points per correct</p>
</Section>

<Section title="Contact">
<Field label="Developer email (alerts go here)">
<input type="email" value={settings.contact.developerEmail}>
    onChange={(e) => set("contact.developerEmail", e.target.value)}
    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/>
</Field>
<Field label="Max contact messages per hour (per email)">
<input type="number" min={1} value={settings.contact.maxMessagesPerHour}>
    onChange={(e) => set("contact.maxMessagesPerHour", Number(e.target.value))}
    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"/>
</Field>
</Section>

<div className="flex justify-end">
<button type="button" onClick={save} disabled={saving}>
<className="rounded-md bg-primary-600 px-5 py-2 text-sm font-sembold text-white hover:bg-primary-700 disabled:opacity-50">
{saving ? "Saving..." : "Save all settings"}
</button>
</div>
</div>
);
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
return (
<section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
<h2 className="text-sm font-bold text-slate-700">{title}</h2>
{children}
</section>
);
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
return (
<label className="block">
<span className="mb-1·block·text-xs·font-medium·text-slate-600">{label}</span>
{children}
</label>
);
}

function Toggle({label, checked, onChange}: {label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex·items-center·justify-between·gap-3·rounded-md·border·border-slate-200·px-3·py-2·text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}