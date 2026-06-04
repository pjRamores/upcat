import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "@/lib/api";
import SEOHead from "@/components/Seo";
import Spinner from "@/components/Spinner";
import AdSlot from "@/components/AdSlot";
import { renderMarkdown } from "@/lib/markdown";
import {
  type BlogPost,
  blogPostingSchema,
  breadcrumbSchema,
  canonicalUrl,
  DEFAULT_SITE_URL,
  estimateReadMinutes,
} from "@upcat/shared";

const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ?? DEFAULT_SITE_URL;

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<BlogPost>('/blog/${encodeURIComponent(slug)}')
      .then(res) => {
        if (!cancelled) {
          setPost(res.data);
          setStatus(200);
        }
      })
      .catch(err) => {
        if (cancelled) return;
        const s = (err as { response?: { status?: number } }).response?.status ?? 500;
        setStatus(s);
      }
      .finally() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const html = useMemo(() => (post ? renderMarkdown(post.body) : ""), [post]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (status === 404 || !post) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <SEOHead title="Post not found" description="The requested blog post was not found." noIndex />
        <h1 className="text-2xl font-semibold text-slate-900">Post not found</h1>
        <p className="mt-2 text-sm text-slate-600">It may have been moved or unpublished.</p>
        <button onClick={() => navigate("/blog")} className="mt-6 rounded bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
          Back to blog
        </button>
      </div>
    );
  }

  const url = canonicalUrl(`/blog/${post.slug}`, SITE_URL);
  const readMinutes = estimateReadMinutes(post.body);
  const schemas = [
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
    blogPostingSchema({
      title: post.title,
      description: post.summary,
      url,
      image: post.heroImage ?? undefined,
      authorName: post.authorName,
      datePublished: post.publishedAt ?? post.updatedAt,
      dateModified: post.updatedAt,
    }),
  ];

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <SEOHead
        title={post.title}
        description={post.summary}
        canonicalUrl={url}
        ogType="article"
        ogImage={post.heroImage ?? undefined}
        structuredData={schemas}
      />
    </article>
  );
}
<nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
    <Link to="/" className="hover:text-primary-700">Home</Link>
    <Link to="/blog" className="hover:text-primary-700">Blog</Link>
</nav>
<header className="mb-6">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900">{post.title}</h1>
    <p className="mt-3 text-sm text-slate-500">
        By {post.authorName} {post.publishedAt && (
            <>
                {"· "}
                <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString()}</time>
            </>
        )}
        {"· "}
        {readMinutes} min read
    </p>
    {post.tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
                <li key={t}>
                    <Link to={`/blog?tag=${encodeURIComponent(t)}`} className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-800 hover:bg-slate-300">
                        #{t}
                    </Link>
                </li>
            ))}
        </ul>
    )}
</header>
{post.heroImage && (
    <img src={post.heroImage} alt="" className="mb-6 w-full rounded object-cover" />
)}
<div className="prose prose-slate max-w-none">
    {/*eslint-disable-next-line react/no-danger--renderMarkdown escapes input*/}
    dangerouslySetInnerHTML={{ __html: html }}
</div>
<div className="mt-10">
    <AdSlot slotId="blog_in_content"/>
</div>
<div className="mt-10 border-t border-slate-200 pt-6 text-sm">
    <Link to="/blog" className="text-primary-700 hover:underline">Back to all posts</Link>
</div>
</article>
