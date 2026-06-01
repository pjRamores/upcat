import {useEffect, useMemo, useState} from "react";
import {Link, useParams} from "react-router-dom";
import Seo from "@/components/Seo";
import {helpApi} from "@/lib/helpApi";
import {renderMarkdown} from "@/lib/markdown";
import {useAuthStore} from "@/stores/authStore";

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

function slugifyHeading(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function extractHeadings(markdown: string): HeadingItem[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
      if (!match) return null;
      const headingMarks = match[1];
      const headingText = match[2];
      if (!headingMarks || !headingText) return null;
      const text = headingText.replace(/[*_]/g, "").trim();
      return {
        id: slugifyHeading(text),
        text,
        level: headingMarks.length,
      };
    })
    .filter((item): item is HeadingItem => item !== null);
}

function addHeadingAnchors(html: string): string {
  return html.replace(/<h([2-3])>(.*?)<\/h\1>/g, (_full, level, content) => {
    const plain = String(content).replace(/<[^>]+>/g, "")
    const id = slugifyHeading(plain);
    return `<h${level} id="${id}">{content}</h${level}>`;
  });
}

export default function HelpArticlePage() {
  const {slug = ""} = useParams<{slug: string}}();
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const [article, setArticle] = useState<any | null>(null);
  const [related, setRelated] = useState<Array<{slug: string; title: string; subtitle?: string | null}}>([]);
  const [feedbackState, setFeedbackState] = useState<["idle" | "sent"]>("idle");
  const [notHelpfulComment, setNotHelpfulComment] = useState("");

  useEffect(() => {
    helpApi
      .getArticle(slug)
      .then((data) => {
        setArticle(data.article);
        setRelated(data.relatedArticles);
      })
      .catch(() => {
        setArticle(null);
        setRelated([]);
      });
    }, [slug]);

    const headings = useMemo(() => extractHeadings(String(article?.content?.body??"")), [article?.content?.body]);

    const html = useMemo(() => {
      const raw = String(article?.content?.body??"");
      return addHeadingAnchors(renderMarkdown(raw));
    }, [article?.content?.body]);

    async function sendFeedback(helpful: boolean) {
      await helpApi.feedback(slug, {
        helpful,
        comment: helpful ? undefined : notHelpfulComment.trim() || undefined,
      }).catch(() => undefined);
      setFeedbackState("sent");
    }

    if (!article) {
      return {
        div: className="mx-auto max-w-3xl px-4 py-16">
          <p className="text-sm text-slate-600">Article not found.</p>
          <Link to="/help" className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline">Back
          to Help Center</Link>
        </div>
      };
    }

    return {
      div: className="mx-auto grid max-w-7x1 gap-8 px-4 py-10 lg:grid-cols-[1fr,260px]">
        Seo.title={`${article.title} - Help Center`} .description={article.subtitle??article.title}/

        article
        <nav className="text-xs text-slate-500">
          <Link to="/help" className="hover:text-indigo-700">Help</Link>
          <span></span>
          <Link to={`/help/category/${article.category}`}
            className="hover:text-indigo-700">{article.category}</Link>
          <span></span>
          <span>{article.title}</span>
        </nav>
      }
    }
}
<h1 className="mt-3·text-3x1·font-bold·text-slate-900">{article.title}</h1>
{article.subtitle}&&<p className="mt-2·text-sm·text-slate-700">{article.subtitle}</p>}

{Array.isArray(article.quickFacts)&&article.quickFacts.length>0&&(
  <section className="mt-5·rounded-xl·border·border-indigo-100·bg-indigo-50·p-4">
    <h2 className="text-sm·font-semibold·text-indigo-900">Quick·Facts</h2>
    <dl className="mt-2·grid·gap-2·sm:grid-cols-2">
      {article.quickFacts.map((fact:{label:string;value:string}})=>(
        <div key={fact.label} className="rounded-md·bg-white·px-3·py-2">
          <dt className="text-xs·uppercase·tracking-wide·text-slate-500">{fact.label}</dt>
          <dd className="text-sm·font-medium·text-slate-900">{fact.value}</dd>
        </div>
      ))}
    </dl>
  </section>
)}}

<div className="prose·prose-slate·mt-6·max-w-none·dangerouslySetInnerHTML={{__html:html}}/>

{Array.isArray(article.faqs)&&article.faqs.length>0&&(
  <section className="mt-8·rounded-xl·border·border-slate-200·bg-white·p-4">
    <h2 className="text-lg·font-semibold·text-slate-900">FAQ</h2>
    <div className="mt-3·space-y-2">
      {article.faqs.map((faq:{question:string;answer:string}})=>(
        <details key={faq.question} className="rounded-lg·border·border-slate-200·px-3·py-2">
          <summary>
            className="cursor-pointer·text-sm·font-medium·text-slate-900">{faq.question}</summary>
            <p className="mt-2·text-sm·text-slate-700">{faq.answer}</p>
          </summary>
        ))}
      </div>
    </section>
  )}
}

{related.length>0&&(
  <section className="mt-8">
    <h2 className="text-lg·font-semibold·text-slate-900">Related·Articles</h2>
    <div className="mt-3·grid·gap-3·sm:grid-cols-2">
      {related.map((item)=>(
        <Link key={item.slug} to={`/help/article/${item.slug}`}>
          <className="rounded-lg·border·border-slate-200·bg-white·p-3·hover:bg-slate-50">
            <p className="text-sm·font-medium·text-slate-900">{item.title}</p>
            {item.subtitle &&<p className="text-xs·text-slate-600">{item.subtitle}</p>}
          </Link>
        ))}
      </div>
    </section>
  )}
}

{section className="mt-8·rounded-xl·border·border-slate-200·bg-white·p-4">
  <h2 className="text-sm·font-semibold·text-slate-900">Was·this·article·helpful?</h2>
  {feedbackState === "sent"?(
    <p className="mt-2·text-sm·text-emerald-700">Thanks·for·the·feedback.</p>
  ):(
    <>
      <div className="mt-3·flex·flex-wrap·gap-2">
        <button type="button">
          className="rounded-md·border·border-slate-300·px-3·py-1.5·text-sm·hover:bg-slate-50"
          onClick={()=>void.sendFeedback(true)}
        </button>
        <button type="button">
          className="rounded-md·border·border-slate-300·px-3·py-1.5·text-sm·hover:bg-slate-50"
          onClick={()=>void.sendFeedback(false)}
        </button>
      </div>
      <textarea
        value={notHelpfulComment}
        onChange={(event)=>setNotHelpfulComment(event.target.value)}
        className="mt-3·w-full·rounded-md·border·border-slate-300·px-3·py-2·text-sm"
        rows={3}
        placeholder="Optional: tell·us·what·was·missing"
      />
    </div>
  ))}
</section>

<div className="mt-6·flex·flex-wrap·gap-4·text-sm">
  <Link to="/help" className="font-medium·text-indigo-700·hover:underline">Back·to·Help·Center</Link>
  {isAdmin && <Link to="/admin/help/articles" className="text-slate-700·hover:underline">Edit·this</Link>
  }</div>
</article>

<aside className="hidden·lg:block">
  <div className="sticky·top-20·rounded-xl·border·border-slate-200·bg-white·p-4·shadow-sm">
    <h2 className="text-sm·font-semibold·text-slate-900">Table·of·Contents</h2>
    <ul className="mt-3·space-y-1">
      {headings.map((heading)=>(
        <li key={heading.id} className={heading.level === 3?:"pl-3"::""}>
          <a href={`#${heading.id}`} className="text-xs·text-slate-600·hover:text-indigo-700">
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  </div>
</aside>
</div>
);