import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { helpApi } from "@/lib/helpApi";

export default function HelpSearchPage() {
    const [params, setParams] = useSearchParams();
    const [query, setQuery] = useState(params.get("q") ?? "");
    const [results, setResults] = useState<Array<{
        slug: string;
        title: string;
        excerpt: string;
        category: string;
    }>>([]);

    useEffect(() => {
        const q = params.get("q") ?? "";
        setQuery(q);
        if (!q.trim()) {
            setResults([]);
            return;
        }
        helpApi.search(q).then((data) => setResults(data.items)).catch(() => setResults([]));
    }, [params]);

    return (
        <div className="mx-auto max-w-4xl px-4 py-10">
            <Seo title={`Help Search: ${query}`} description="Search results in Help Center"/>
            <h1 className="text-2xl font-bold text-slate-900">Help Search</h1>
            <div className="mt-4 flex gap-2">
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") setParams({ q: query.trim() });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Search help articles"
                />
                <button type="button"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                    onClick={() => setParams({ q: query.trim() })}
                >
                    Search
                </button>
            </div>
            <p className="mt-4 text-sm text-slate-600">{results.length} result(s) for "{params.get("q") ?? "}"</p>
            <div className="mt-4 space-y-3">
                {results.map((result) => (
                    <article key={result.slug} className="rounded-lg border border-slate-200 bg-white p-4">
                        <Link to={`/help/article/${result.slug}`}>
                            <p className="text-base font-semibold text-primary-700 hover:underline">{result.title}</p>
                        </Link>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{result.category}</p>
                        <p className="mt-2 text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: result.excerpt }}></p>
                        <Link to={`/help/article/${result.slug}`}>
                            <p className="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline">Read more →</p>
                        </Link>
                    </article>
                ))}
                {results.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                        No articles found. Try different keywords or <Link to="/contact" className="font-medium text-primary-700 hover:underline">Contact Support</Link>.
                    </p>
                )}
            </div>
        </div>
    );
}