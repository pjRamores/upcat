import { Link } from "react-router-dom";
import SEOHead from "@/components/SEO";
import AdSlot from "@/components/AdSlot";
import { useAuthStore } from "@/stores/authStore";
import { breadcrumbSchema, courseSchema, DEFAULT_SITE_URL, SUBJECT_META, type SubjectArea, } from "@upcat/shared";

const SITE_URL =
    (import.meta.env.VITE_SITE_URL as string | undefined) ?? DEFAULT_SITE_URL;

export interface SubjectPageProps {
    subject: SubjectArea;
    /** Path of this subject page, e.g. "/subjects/mathematics". */
    path: string;
    title: string;
    description: string;
    intro: string;
    keywords: string[];
    /** Bullet list shown under "What's covered". */
    topics: string[];
    /** A canonical sample question rendered so visitors land on real content. */
    sampleQuestion: {
        prompt: string;
        choices: { letter: "A" | "B" | "C" | "D"; text: string }[];
        answerLetter: "A" | "B" | "C" | "D";
        explanation: string;
    };
    /** Approximate stats shown as social proof on the page. */
    stats: { questionCount: string; subtopicCount: string };
    /** Pre-filtered practice URL the CTA points at. */
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
        { name: "Home", path: "/" },
        { name: "Subjects", path: "/" },
        { name: meta.label, path: props.path },
    ];

    return (
        <>
            <SEOHead
                title={props.title}
                description={props.description}
                keywords={props.keywords}
                bareTitle
                structuredData={[
                    breadcrumbSchema(breadcrumbs, SITE_URL),
                    courseSchema({
                        name: props.title,
                        description: props.description,
                        url: SITE_URL.replace(/\/+$/, "") + props.path,
                    }),
                ]}
            />
            <article className="bg-white">
                <header className="bg-gradient-to-b from-primary-50 via-white to-white">
                    <div className="mx-auto max-w-4xl px-4 py-16 sm:py-20">
                        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-gray-500">
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
                        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-primary-700">
                            <span className="text-2xl">{meta.icon}</span>
                            <span>UPCAT Subject</span>
                        </div>
                        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                            UPCAT {meta.label} Review & Practice
                        </h1>
                        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">
                            {props.intro}
                        </p>
                        <dl className="mt-8 grid max-w-md grid-cols-2 gap-6 text-sm">
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-gray-500">
                                    Questions
                                </dt>
                                <dd className="mt-1 text-2xl font-bold text-gray-900">
                                    {props.stats.questionCount}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wide text-gray-500">
                                    Subtopics
                                </dt>
<p className="mt-3 text-base text-gray-600">
    Start a focused practice session - instant scoring, full
    explanations, and analytics so you can watch your accuracy climb.
</p>
<div className="mt-6 flex flex-wrap justify-center gap-3">
    <Link
        to={props.practiceCtaHref}
        className="btn-primary text-base !px-6 !py-3"
    >
        Start Practicing Now →
    </Link>
    <Link to="/" className="btn-secondary text-base !px-6 !py-3">
        Back to Home
    </Link>
</div>
</section>
</article>
