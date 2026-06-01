import {Link} from "react-router-dom";
import SEOHead from "@/components/Seo";
import AdSlot from "@/components/AdSlot";
import {useAuthStore} from "@/stores/authStore";
import {breadcrumbSchema, courseSchema, DEFAULT_SITE_URL, SUBJECT_META, type, SubjectArea,} from "@upcat/shared";

const SITE_URL =
(import.meta.env.VITE_SITE_URL as string | undefined) ?? DEFAULT_SITE_URL;

export interface SubjectPageProps {
  subject: SubjectArea;
  /** Path of this subject page, e.g. "/subjects/mathematics".*/
  path: string;
  title: string;
  description: string;
  intro: string;
  keywords: string[];
  /** Bullet list shown under "What's covered".*/
  topics: string[];
  /** A canonical sample question rendered so visitors land on real content.*/
  sampleQuestion: {
    prompt: string;
    choices: {letter: "A" | "B" | "C" | "D"; text: string}[];
    answerLetter: "A" | "B" | "C" | "D";
    explanation: string;
  };
  /** Approximate stats shown as social proof on the page.*/
  stats: {questionCount: string; subtopicCount: string};
  /** Pre-filtered practice URL the CTA points at.*/
  practiceCtaHref: string;
}

/**
 * Generic, content-rich subject landing page. Used to back the
 * /subjects/* routes so each subject has a dedicated SEO-friendly URL.
 */
export default function SubjectPage(props: SubjectPageProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const meta = SUBJECT_META[props.subject];
  const breadcrumbs = [
    {name: "Home", path: "/"},
    {name: "Subjects", path: "/"},
    {name: meta.label, path: props.path},
  ];

  return (
    <>
      <SEOHead
        title={props.title}
        description={props.description}
        keywords={props.keywords}
        bareTitle
        structuredData={[
          breadcrumbSchema(breadcrumb, SITE_URL),
          courseSchema({
            name: props.title,
            description: props.description,
            url: SITE_URL.replace(/\/+$/, "") + props.path,
          })
        ]}
      />
      <article className="bg-white">
        <header className="bg-gradient-to-b from-primary-50 via-white to-white">
          <div className="mx-auto max-w-4x1 px-4 py-16 sm:py-20">
            <nav
              aria-label="Breadcrumb"
              className="mb-6 flex items-center gap-2 text-sm text-gray-500"
            >
              <Link to="/" className="hover:text-primary-700">
                Home
              </Link>
              <span aria-hidden></span>
              <Link to="/" className="hover:text-primary-700">
                Subjects
              </Link>
              <span aria-hidden></span>
              <span className="text-gray-700">{meta.label}</span>
            </nav>

            <div
              className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-primary-700">
              <span className="text-2xl">{meta.icon}</span>
              <span>UPCAT Subject</span>
            </div>
            <h1 className="mt-3 text-4x1 font-extrabold tracking-tight text-gray-900 sm:text-5x1">
              UPCAT {meta.label} Review &amp; Practice
            </h1>
            <p className="mt-4 max-w-2x1 text-lg leading-relaxed text-gray-600">
              {props.intro}
            </p>

            <dl className="mt-8 grid max-w-md grid-cols-2 gap-6 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">
                  Questions
                </dt>
                <dd className="mt-1 text-2x1 font-bold text-gray-900">
                  {props.stats.questionCount}
                </dd>
              </div>
            </div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Subtopics
</dt>
<dd className="mt-1·text-2x1·font-bold·text-gray-900">
{props.stats.subtopicCount}
</dd>
</div>
</dl>

<div className="mt-8·flex·flex-wrap·gap-3">
<Link
to={props.practiceCtaHref}
className="btn-primary·text-base·!px-6·!py-3"
>
Start Practicing {meta.label} →
</Link>
{!isAuthenticated && (
<Link to="/register" className="btn-secondary·text-base·!px-6·!py-3">
Create Account
</Link>
)}
</div>
</div>
</header>

<section className="mx-auto·max-w-4x1·px-4·py-12">
<h2 className="text-2x1·font-bold·tracking-tight·text-gray-900">
What's covered
</h2>
<ul className="mt-6·grid·gap-3·sm:grid-cols-2">
{props.topics.map((t) => (
<li
key={t}
className="flex·items-start·gap-3·rounded-x1·border·border-gray-200·bg-white·p-4·shadow-sm"
>
<span
aria-hidden
className="mt-1·inline-flex·h-5·w-5·shrink-0·items-center·justify-center·rounded-full·bg-primary-100·text-primary-700"
>
<svg width="12" height="12" viewBox="0·0·20·20" fill="currentColor">
<path
fillRule="evenodd"
d="M16.7·5.3a1·1·0·010·1.41-7·7a1·1·0·01-1.4·01-3·3a1·1·0·011.4-1.412.3·2.3·6.3-6.3a1·1·0·011.4·0z"
clipRule="evenodd"
/>
</svg>
</span>
<span className="text-sm·text-gray-700">{t}</span>
</li>
))}
</ul>
</section>

<section className="bg-slate-50·py-12">
<div className="mx-auto·max-w-4x1·px-4">
<h2 className="text-2x1·font-bold·tracking-tight·text-gray-900">
Sample question
</h2>
<div className="mt-6·rounded-2x1·border·border-gray-200·bg-white·p-6·shadow-sm">
<p className="text-sm·font-medium·leading-relaxed·text-gray-800">
{props.sampleQuestion.prompt}
</p>
<ul className="mt-4·space-y-2·text-sm">
{props.sampleQuestion.choices.map((c) => (
<li
key={c.letter}
className=[
"flex·items-center·gap-3·rounded-lg·border·px-3·py-2",
c.letter === props.sampleQuestion.answerLetter
?."border-green-300·bg-green-50·text-green-900"
:."border-gray-200·text-gray-700",
].join("·"))
>
<span
className=[
"inline-flex·h-6·w-6·items-center·justify-center·rounded-full·text-xs·font-bold",
c.letter === props.sampleQuestion.answerLetter
?."bg-green-600·text-white"
:."bg-gray-100·text-gray-600",
].join("·")
>
{c.letter}
</span>
{c.text}
</li>
))}
</ul>
<div
className="mt-5·rounded-md·border·border-green-200·bg-green-50/50·p-3·text-xs·leading-relaxed·text-green-900">
<strong className="font-sembold">
Answer: {props.sampleQuestion.answerLetter}.
</strong>{"."}
{props.sampleQuestion.explanation}
</div>
</div>
</div>
</section>

<div className="mx-auto·max-w-4x1·px-4·pb-6">
<AdSlot·slotId="subject_in_content"/>
</div>

<section className="mx-auto·max-w-4x1·px-4·py-14·text-center">
<h2 className="text-2x1·font-bold·tracking-tight·text-gray-900">
Ready to drill {meta.label.toLowerCase()}?
</h2>
<p className="mt-3 text-base text-gray-600">
Start a focused practice session — instant scoring, full explanations, and analytics so you can watch your accuracy climb.
</p>
<div className="mt-6 flex flex-wrap justify-center gap-3">
<Link
to={props.practiceCtaHref}
className="btn-primary text-base !px-6 !py-3"
>
Start Practicing Now
</Link>
<Link to="/" className="btn-secondary text-base !px-6 !py-3">
Back to Home
</Link>
</div>
</section>
</article>
</>
);