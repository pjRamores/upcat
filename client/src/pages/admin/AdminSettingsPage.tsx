const segments = path.split('.');
let current: Record<string, unknown> = copy as unknown as Record<string, unknown>;
for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const next = current[key];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
        current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
}
current[segments[segments.length - 1]] = value;
return copy;
});

return (
    <div className="space-y-6">
        <Section title="Registration">
            <Toggle label="Open for new sign-ups" checked={settings.registration.isOpen}
                onChange={(v) => set("registration.isOpen", v)} />
            <Toggle label="Require email verification" checked={settings.registration.requireEmailVerification}
                onChange={(v) => set("registration.requireEmailVerification", v)} />
            <Toggle label="Allow sign-up by email/password" checked={settings.registration.allowEmailSignup}
                onChange={(v) => set("registration.allowEmailSignup", v)} />
            <p className="text-xs text-slate-500">
                When disabled, at least one social login provider must be enabled in Auth Providers.
            </p>
        </Section>

        <Section title="Maintenance">
            <Toggle label="Maintenance mode enabled" checked={settings.maintenance.isEnabled}
                onChange={(v) => set("maintenance.isEnabled", v)} />
            <Field label="Banner message">
                <textarea rows={3} value={settings.maintenance.message}
                    onChange={(e) => set("maintenance.message", e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </Field>
        </Section>

        <Section title="Leaderboard">
            <Toggle label="Leaderboard enabled" checked={settings.leaderboard.isEnabled}
                onChange={(v) => set("leaderboard.isEnabled", v)} />
            <Toggle label="Show full names" checked={settings.leaderboard.showFullName}
                onChange={(v) => set("leaderboard.showFullName", v)} />
        </Section>

        <Section title="Exam Scoring System">
            <p className="mb-3 text-xs text-slate-500">Configure how exam scores are calculated</p>
            <div className="grid grid-cols-3 gap-3">
                <Field label="Points per correct answer">
                    <input type="number" step={0.25} value={settings.scoring.correct}
                        onChange={(e) => set("scoring.correct", Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                </Field>
                <Field label="Points per incorrect answer">
                    <input type="number" step={0.25} value={settings.scoring.incorrect}
                        onChange={(e) => set("scoring.incorrect", Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                </Field>
                <Field label="Points per unanswered">
                    <input type="number" step={0.25} value={settings.scoring.unanswered}
                        onChange={(e) => set("scoring.unanswered", Number(e.target.value))}
                        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                </Field>
            </div>
            <p className="mt-3 text-xs text-slate-500">Score percentage = (raw score / max possible score) × 100,
                where max = correct answers × points per correct</p>
        </Section>

        <Section title="Contact">
            <Field label="Developer email (alerts go here)">
                <input type="email" value={settings.contact.developerEmail}
                    onChange={(e) => set("contact.developerEmail", e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </Field>
            <Field label="Max contact messages per hour (per email)">
                <input type="number" min={1} value={settings.contact.maxMessagesPerHour}
                    onChange={(e) => set("contact.maxMessagesPerHour", Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </Field>
        </Section>

        <div className="flex justify-end">
            <button type="button" onClick={save} disabled={saving}
                className="rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save all settings"}
            </button>
        </div>
    </div>
);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700">{title}</h2>
            {children}
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
function Toggle({label, checked, onChange}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span>{label}</span>
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/>
        </label>
    );
}