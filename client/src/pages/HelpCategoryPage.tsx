import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { helpApi } from "@/lib/helpApi";
import type { HelpCategoryInfo } from "@upcat/shared";

export default function HelpCategoryPage() {
  const { category = "" } = useParams<{ category: string }>();
  const [meta, setMeta] = useState<HelpCategoryInfo | null>(null);
  const [categories, setCategories] = useState<HelpCategoryInfo[]>([]);
  const [items, setItems] = useState<
    Array<{
      slug: string;
      title: string;
      subtitle: string | null;
      estimatedReadingMinutes: number;
    }>
  >([]);

  useEffect(() => {
    helpApi
      .categories()
      .then((result) => {
        setCategories(result);
        setMeta(result.find((c) => c.category === category) ?? null);
      })
      .catch(() => {
        setCategories([]);
        setMeta(null);
      });
  }, [category]);

  useEffect(() => {
    helpApi
      .listArticles({ category, limit: 100, page: 1 })
      .then((result) => setItems(result.items))
      .catch(() => setItems([]));
  }, [category]);

  const title = useMemo(() => meta?.name ?? "Help Category", [meta]);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr,280px]">
      <Seo
        title={`${title} - Help Center`}
        description={meta?.description || "Help category documentation"}
      />

      <section>
        <nav className="mb-3 text-xs text-slate-500">
          <Link to="/help" className="hover:text-indigo-700">
            Help
          </Link>{" "}
          / <span>{title}</span>
        </nav>

        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>

        {meta?.description && (
          <p className="mt-2 text-sm text-slate-700">{meta.description}</p>
        )}

        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <Link key={item.slug} to={`/help/article/${item.slug}`}>
              <div className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50">
                <p className="text-base font-semibold text-slate-900">{item.title}</p>
                {item.subtitle && (
                  <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Estimated read: {item.estimatedReadingMinutes} min
                </p>
              </div>
            </Link>
          ))}

          {items.length === 0 && (
            <p className="text-sm text-slate-600">
              No published articles in this category yet.
            </p>
          )}
        </div>
      </section>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:h-fit">
        <h2 className="text-sm font-semibold text-slate-900">Other Categories</h2>
        <div className="mt-3 space-y-2">
          {categories
            .filter((item) => item.category !== category)
            .map((item) => (
              <Link key={item.category} to={`/help/category/${item.category}`}>
                <div className="block rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                  {item.name}
                </div>
              </Link>
            ))}
        </div>
      </aside>
    </div>
  );
}
