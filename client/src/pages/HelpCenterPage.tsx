import {useEffect, useMemo, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import type {HelpCategoryInfo} from "@upcat/shared";
import Seo from "@/components/Seo";
import {helpApi} from "@/lib/helpApi";

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<HelpCategoryInfo[]>([]);
  const [popular, setPopular] = useState<Array<{slug: string; title: string; subtitle: string | null}}>>([]);
  const [searchPreview, setSearchPreview] = useState<Array<{slug: string; title: string; excerpt: string}}>>([]);

  useEffect(() => {
    helpApi
    .categories()
    .then(setCategories)
    .catch(() => setCategories([]));

    helpApi
    .listArticles({limit: 5, page: 1})
    .then((data) => {
      setPopular(
        data.items
        .slice()
        .sort((a, b) => (a.title > b.title ? 1 : -1))
        .map((item) => ({slug: item.slug, title: item.title, subtitle: item.subtitle ?? null})),
      );
    })
    .catch(() => setPopular([]));
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setSearchPreview([]);
      return;
    }
    const id = window.setTimeout(() => {
      helpApi
      .search(value)
      .then((result) => setSearchPreview(result.items.slice(0, 5)))
      .catch(() => setSearchPreview([]));
    }, 250);
    return () => window.clearTimeout(id);
  }, [query]);

  const quickLinks = useMemo(
    () => [
      {title: "How Practice Tests Work", slug: "how-practice-test-works"},
      {title: "How Mock Exams Work", slug: "how-mock-exam-works"},
      {title: "Understanding XP & Levels", slug: "xp-levels-progress"},
      {title: "Common Issues", slug: "common-issues"},
    ],
    [],
    []);
}

return (
  <div className="mx-auto max-w-6x1 px-4 py-10">
    <Seo title="Help Center" description="Beginner-friendly guides for every UPCAT Simulator feature." />

    <header>
      className="rounded-2x1 border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6">
        <h1 className="text-3x1 font-bold text-slate-900">Help Center</h1>
        <p className="mt-2 max-w-2x1 text-sm text-slate-700">
          Learn every feature without leaving context. Search guides, open category docs, and replay onboarding tours.
        </p>
        <div className="mt-5 space-y-2">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && query.trim()) {
                  navigate('/help/search?q=${encodeURIComponent(query.trim())}');
                }
              }}
            }
            placeholder="Search for help..."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 "+
              "focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() => navigate('/help/search?q=${encodeURIComponent(query.trim())}')}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Search
            </button>
          </div>
          {searchPreview.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-2">
              {searchPreview.map((item) => (
                <Link key={item.slug} to={`/help/article/${item.slug}`}
                className="block rounded-lg px-3 py-2 hover:bg-slate-50">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  <p className="line-clamp-1 text-xs text-slate-600"
                    dangerouslySetInnerHTML={{__html: item.excerpt}}/>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  </div>
}
<section className="mt-8">
  <h2 className="text-xl font-semibold text-slate-900">Categories</h2>
  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {categories.map((category) => (
      <Link
        key={category.category}
        to={`/help/category/${category.category}`}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-hover:-translate-y-0.5 hover:shadow"
      >
        <p className="text-2xl">{category.icon}</p>
        <p className="mt-2 font-semibold text-slate-900">{category.name}</p>
        <p className="mt-1 text-xs text-slate-600">{category.articleCount} article(s)</p>
      </Link>
    ))}
  </div>
</section>

<section className="mt-8 grid gap-6 md:grid-cols-2">
  <div>
    <h3 className="text-lg font-semibold text-slate-900">Popular Articles</h3>
    <div className="mt-3 space-y-2">
      {popular.map((article) => (
        <Link key={article.slug} to={`/help/article/${article.slug}`}
        className="block rounded-lg border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
          <p className="text-sm font-medium text-slate-900">{article.title}</p>
          {article.subtitle && <p className="text-xs text-slate-600">{article.subtitle}</p>}
        </Link>
      ))}
    </div>
  </div>

  <div>
    <h3 className="text-lg font-semibold text-slate-900">Quick Links</h3>
    <div className="mt-3 space-y-2">
      {quickLinks.map((link) => (
        <Link key={link.slug} to={`/help/article/${link.slug}`}
        className="block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          {link.title}
        </Link>
      ))}
    </div>

    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-900">Need a refresher?</p>
      <p className="mt-1 text-xs text-slate-600">Replay onboarding tours from Settings → Help & Guidance.</p>
    </div>
  </div>
</section>

<footer className="mt-10 text-sm text-slate-600">
  Can't find what you need? <Link to="/contact">className="font-medium text-indigo-700 hover:underline">Contact Support</Link>
</footer>
</div>
);