import {useEffect, useState} from "react";
import {adminApi} from "@/lib/adminApi";
import {useToastStore} from "@/stores/toastStore";

export default function AdminHelpAnalyticsPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [data, setData] = useState<Record<string, unknown>>(null);

  useEffect(() => {
    adminApi
      .helpAnalytics()
      .then((result) => setData(result))
      .catch(() => addToast("error", "Failed to load help analytics."));
  }, []);

  const mostViewed = (data?.mostViewedArticles as Array<Record<string, unknown>>) || undefined) ?? [];
  const leastHelpful = (data?.leastHelpfulArticles as Array<Record<string, unknown>>) || undefined) ?? [];
  const noResults = (data?.searchTermsWithNoResults as Array<Record<string, unknown>>) || undefined) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Help Analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Usage, feedback quality, onboarding completion, and engagement diagnostics.</p>
      </header>

      <section className="grid·gap-4·md:grid-cols-2">
        <Panel title="Most Viewed Articles">
          <ul className="space-y-1 text-sm">
            {mostViewed.map((row) => (
              <li key={String(row.slug)}>{String(row.title)}</span>
              className="text-slate-500">{{Number(row.viewCount ?? 0)} views}}</span></li>
            ))}
          </ul>
        </Panel>

        <Panel title="Least Helpful Articles">
          <ul className="space-y-1 text-sm">
            {leastHelpful.map((row) => (
              <li key={String(row.slug)}>{String(row.title)}</span>
              className="text-slate-500">{{Math.round(Number(row.helpfulRate ?? 0) * 100)} helpful}}</span>
            ))}
          </ul>
        </Panel>

        <Panel title="Search Terms with No Results">
          <ul className="space-y-1 text-sm">
            {noResults.map((row) => (
              <li key={String(row.term)}>{String(row.term)}</span>
              className="text-slate-500">{{Number(row.count ?? 0)} }}</span></li>
            ))}
          </ul>
        </Panel>

        <Panel title="Feedback Summary">
          <pre>
            className="overflow-x-auto rounded·bg-slate-50·p-2·text-xs">{JSON.stringify(data?.feedbackSummary ?? {}, null, 2)}</pre>
          </pre>
        </Panel>

        <section className="grid·gap-4·md:grid-cols-2">
          <Panel title="Onboarding Completion Rates">
            <pre>
            className="overflow-x-auto rounded·bg-slate-50·p-2·text-xs">{JSON.stringify(data?.onboardingCompletionRates ?? {}, null, 2)}</pre>
            </pre>
          </section>

          <Panel title="Contextual Help Dismiss Rates">
            <pre>
            className="overflow-x-auto rounded·bg-slate-50·p-2·text-xs">{JSON.stringify(data?.contextualHelpDismissRates ?? {}, null, 2)}</pre>
            </pre>
          </section>

          <Panel title="Feedback Comments">
            <pre>
            className="overflow-x-auto rounded·bg-slate-50·p-2·text-xs">{JSON.stringify(data?.feedbackComments ?? {}, null, 2)}</pre>
            </pre>
          </section>
        </div>
      );
    }
}

function Panel({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="rounded-xl·border·border-slate-200·bg-white·p-4·shadow-sm">
      <h2 className="text-sm·font-sembold·text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}