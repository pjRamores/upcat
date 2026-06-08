import {useEffect, useRef} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {useAuthStore} from "@/stores/authStore";
import SEOHead from "@/components/Seo";
import AdSlot from "@/components/AdSlot";
import {
    type FaqItem,
    faqSchema,
    organizationSchema,
    SUBJECT_AREAS,
    SUBJECT_META,
    webApplicationSchema
} from "@upcat/shared";

const LANDING_FAQ: FaqItem[] = [
    {
        question: "What is the UPCAT?",
        answer:
            "The UPCAT (University of the Philippines College Admission Test) is the entrance examination administered by the University of the Philippines to applicants seeking admission to its undergraduate programs. It assesses aptitude in Language Proficiency, Mathematics, Science, and Reading Comprehension.",
    },
    {
        question: "How many questions are on the UPCAT?",
        answer:
            "The UPCAT consists of roughly 200 multiple-choice questions distributed across four subtests. Each subtest is timed independently and contributes to the composite University Predicted Grade (UPG) used in admissions.",
    },
    {
        question: "What subjects does the UPCAT cover?",
        answer:
            "The exam covers four subject areas: Language Proficiency (English and Filipino grammar and usage), Mathematics (arithmetic through trigonometry), Science (biology, chemistry, physics, and earth science), and Reading Comprehension (long-form passages with inference and main-idea questions).",
    },
    {
        question: "How can I prepare for the UPCAT?",
        answer:
            "The most effective preparation combines spaced practice with realistic, timed simulations. Use UPCAT Simulator to take full-length mock exams under exam conditions, then drill weak subtopics with the practice mode and review explanations for every question you missed.",
    },
    {
        question: "How do I get started with UPCAT Simulator?",
        answer:
            "Create an account in under a minute to access practice questions, mock exams, analytics, and review tools. You can begin with a quick setup and start practicing right away.",
    },
    {
        question: "How is the score calculated?",
        answer:
            "Each mock exam reports raw correct/incorrect counts per subject area and an overall percentage. Your dashboard tracks accuracy trends, time-per-question, and subtopic mastery so you can target your weakest areas.",
    },
    {
        question: "Is this affiliated with the University of the Philippines?",
        answer:
            "No. UPCAT Simulator is an independent study tool. It is not affiliated with, endorsed by, or connected to the University of the Philippines or the official UPCAT examination.",
    },
];

/**
 * Landing page
 * Redirects authenticated users straight to the dashboard
 * Single-page scroll with hero / features / how-it-works /
 * subjects / social proof / footer-CTA
 * Sections fade in via IntersectionObserver
 */
export default function LandingPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const {isAuthenticated} = useAuthStore();

    useEffect(() => {
        if (isAuthenticated) {
            navigate("/dashboard", {replace: true});
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace("#", "");
            requestAnimationFrame(() => {
                document.getElementById(id)?.scrollIntoView({behavior: "smooth"});
            });
        }
    }, [location.hash]);

    useScrollReveal();

    if (isAuthenticated) return null;

    return (
        <div className="overflow-hidden">
            <SEOHead
                title="UPCAT Simulator - Practice Exams for UP College Admission Test"
                description="Prepare for the UPCAT with thousands of realistic practice questions. Track your progress, identify weak areas, and boost your confidence."
                keywords={[
                    "UPCAT reviewer",
                    "UPCAT practice test",
                    "UPCAT simulator",
                    "UPCAT online review",
                    "UPCAT reviewer online",
                    "UP admission test reviewer",
                ]}
                bareTitle
                structuredData={[
                    organizationSchema(),
                    webApplicationSchema(),
                    faqSchema(LANDING_FAQ),
                ]}
            />
            <Hero/>
            <Features/>
            <HowItWorks/>
            <Subjects/>
            <div className="mx-auto w-full max-w-5xl px-4 py-6">
                <AdSlot slotId="landing_in_content"/>
            </div>
            <SocialProof/>
            <Faq items={LANDING_FAQ}/>
            <FinalCta/>
        </div>
    );
}


function useScrollReveal() {
    useEffect(() => {
        const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
        if (elements.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("reveal-in");
                        observer.unobserve(entry.target);
                    }
                });
            },
            {threshold: 0.12, rootMargin: "0px 0px -40px 0px"},
        );

        elements.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}


function Hero() {
    const heroRef = useRef<HTMLDivElement>(null);

    const scrollToFeatures = () => {
        document
            .getElementById("features")
            ?.scrollIntoView({behavior: "smooth", block: "start"});
    };

    return (
        <section
            ref={heroRef}
            className="relative isolate overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white"
        >
            <div
                aria-hidden
                className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-200/40 blur-3xl"
            />
            <div
                aria-hidden
                className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-amber-100/60 blur-3xl"
            />
            <div
                aria-hidden
                className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e0e7ff_1px,transparent_1px),linear-gradient(to_bottom,#e0e7ff_1px,transparent_1px)] bg-[size:48px_48px] opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]"
            />

            <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-28 lg:grid-cols-12">
                <div className="lg:col-span-7" data-reveal>
          <span
              className="inline-flex items-center gap-2 rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
            <span className="h-2 w-2 rounded-full bg-primary-500"/>
            Built for serious UPCAT prep
          </span>

                    <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                        Ace the{" "}
                        <span
                            className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              UPCAT
            </span>{" "}
                        with Realistic Practice Exams
                    </h1>

                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">
                        Thousands of questions across all subject areas. Track your
                        progress. Know your strengths and weaknesses.
                    </p>

                    <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                        <Link to="/register" className="btn-primary text-base !px-6 !py-3">
                            Get Started →
                        </Link>
                        <button
                            onClick={scrollToFeatures}
                            className="btn-secondary text-base !px-6 !py-3"
                        >
                            Learn More
                        </button>
                    </div>

                    <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 text-sm">
                        <Stat label="Subjects" value="4"/>
                        <Stat label="Questions" value="1,000+"/>
                        <Stat label="Practice Modes" value="2+"/>
                    </dl>
                </div>

                <div className="lg:col-span-5" data-reveal>
                    <StudentIllustration/>
                </div>
            </div>
        </section>
    );
}

function Stat({label, value}: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-gray-900">{value}</dd>
        </div>
    );
}

/* CSS/SVG illustration - no external assets needed. */
function StudentIllustration() {
    return (
        <div className="relative mx-auto aspect-square w-full max-w-md">
            <div
                className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-2xl shadow-primary-200"/>

            <div className="absolute left-6 right-6 top-6 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5">
                <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            Question 42 / 100
          </span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            ⌚️1:24:08
          </span>
                </div>
                <p className="mt-4 text-sm font-medium leading-snug text-gray-800">
                    If <span className="font-mono">f(x) = 3x² - 2x + 5</span>, find{" "}
                    <span className="font-mono">f(2)</span>.
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                    {[
                        {letter: "A", text: "9", state: "default"},
                        {letter: "B", text: "13", state: "selected"},
                        {letter: "C", text: "15", state: "default"},
                        {letter: "D", text: "17", state: "default"},
                    ].map((opt) => (
                        <li
                            key={opt.letter}
                            className={[
                                "flex items-center gap-3 rounded-lg border px-3 py-2 transition",
                                opt.state === "selected"
                                    ? "border-primary-500 bg-primary-50 text-primary-900"
                                    : "border-gray-200 text-gray-700",
                            ].join(" ")}
                        >
                <span
                    className={[
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                        opt.state === "selected"
                            ? "bg-primary-600 text-white"
                            : "bg-gray-100 text-gray-600"
                    ].join(" ")}
                >
                  {opt.letter}
                </span>
                            {opt.text}
                        </li>
                    ))}
                </ul>
            </div>

            <div
                className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-lg">
                    📈
                </div>
                <div>
                    <div className="text-xs text-gray-500">Avg. score</div>
                    <div className="text-lg font-bold text-gray-900">+18%</div>
                </div>
            </div>

            <div
                className="absolute -right-2 top-1/2 flex items-center gap-2 rounded-full bg-white py-2 pl-2 pr-4 shadow-xl ring-1 ring-black/5">
                <span className="text-xl">🔥</span>
                <span className="text-sm font-bold text-gray-900">7-day streak</span>
            </div>
        </div>
    );
}

/* FEATURES */
const FEATURES = [
    {
        icon: "📝",
        title: "Realistic Exam Simulation",
        desc: "Timed, randomized practice exams that cover every UPCAT subject area, just like the real test.",
    },
    {
        icon: "⚡️",
        title: "Instant Scoring & Review",
        desc: "See your score the moment you submit. Review every answer with detailed rationale and explanations.",
    },
    {
        icon: "📊",
        title: "Smart Analytics",
        desc: "Track your performance over time. Identify weak areas and watch your accuracy climb week after week.",
    },
    {
        icon: "🎲",
        title: "Fresh Questions Every Time",
        desc: "A unique exam is generated each session — no memorization shortcuts, no copy-paste cramming.",
    },
];

function Features() {
    return (
        <section id="features" className="scroll-mt-24 bg-white py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-4">
                <div className="mx-auto max-w-2xl text-center" data-reveal>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Everything you need to prepare.
                    </h2>
                    <p className="mt-3 text-lg text-gray-600">
                        Built by students, for students. A focused toolkit for serious
                        UPCAT prep.
                    </p>
                </div>

                <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {FEATURES.map((f, i) => (
                        <div
                            key={f.title}
                            data-reveal
                            style={{transitionDelay: `${i * 60}ms`}}
                            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lg"
                        >
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-2xl ring-1 ring-primary-100 transition-colors group-hover:bg-primary-100">
                                {f.icon}
                            </div>
                            <h3 className="mt-5 text-lg font-semibold text-gray-900">
                                {f.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─────────────────────── HOW IT WORKS ─────────────────────── */
const STEPS = [
    {
        number: "1",
        title: "Create your account",
        desc: "Sign up in under a minute. Verify your email and you're in.",
        icon: "👤",
    },
    {
        number: "2",
        title: "Take a practice exam",
        desc: "Choose your settings or jump straight into a full-length simulation.",
        icon: "📝",
    },
    {
        number: "3",
        title: "Review your results and improve",
        desc: "Read explanations, study your weak subtopics, and try again.",
        icon: "🚀",
    },
];

function HowItWorks() {
    return (
        <section className="bg-gradient-to-b from-white via-primary-50/50 to-white py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-4">
                <div className="mx-auto max-w-2xl text-center" data-reveal>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        How it works
                    </h2>
                    <p className="mt-3 text-lg text-gray-600">
                        Three simple steps from sign-up to score improvement.
                    </p>
                </div>

                <ol className="mt-14 grid gap-8 md:grid-cols-3">
                    {STEPS.map((step, idx) => (
                        <li
                            key={step.number}
                            data-reveal
                            style={{transitionDelay: `${idx * 80}ms`}}
                            className="relative"
                        >
                            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                                <div className="flex items-center gap-4">
                <span
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-lg font-bold text-white shadow-lg shadow-primary-200">
                  {step.number}
                </span>
                                    <span className="text-3xl">{step.icon}</span>
                                </div>
                                <h3 className="mt-5 text-lg font-semibold text-gray-900">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                                    {step.desc}
                                </p>
                            </div>

                            {idx < STEPS.length - 1 && (
                                <div
                                    aria-hidden
                                    className="absolute right-[-22px] top-1/2 hidden -translate-y-1/2 text-primary-300 md:block"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M5 12h14m-6-6l6 6-6 6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

/* ---- SUBJECT AREAS ------------------------------------------ */
const SUBJECT_DESCRIPTIONS: Record<(typeof SUBJECT_AREAS)[number], string> = {
    "Language Proficiency":
        "Vocabulary, grammar, and usage across Filipino and English - the building blocks of every UPCAT section.",
    Mathematics:
        "Arithmetic, algebra, geometry, and basic trigonometry. Practice problem-solving under realistic time pressure.",
    Science:
        "Biology, chemistry, physics, and earth science fundamentals - applied through scenario and analysis questions.",
    "Reading Comprehension":
        "Long-form passages with inference, main-idea, and tone questions to sharpen critical reading.",
};

const SUBJECT_BG: Record<string, string> = {
    indigo: "from-primary-50 to-primary-100 text-primary-700 ring-primary-200",
    blue: "from-blue-50 to-blue-100 text-blue-700 ring-blue-200",
    green: "from-green-50 to-green-100 text-green-700 ring-green-200",
    amber: "from-amber-50 to-amber-100 text-amber-700 ring-amber-200",
};

function Subjects() {
    return (
        <section className="bg-white py-20 sm:py-24">
            <div className="mx-auto max-w-6xl px-4">
                <div className="mx-auto max-w-2xl text-center" data-reveal>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        All four UPCAT subjects, covered.
                    </h2>
                    <p className="mt-3 text-lg text-gray-600">
                        Every subject area on the UPCAT has its own carefully curated
                        question bank.
                    </p>
                </div>

                <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {SUBJECT_AREAS.map((subject, i) => {
                        const meta = SUBJECT_META[subject];
                        const palette = SUBJECT_BG[meta.color] ?? SUBJECT_BG.indigo;
                        return (
                            <div
                                key={subject}
                                data-reveal
                                style={{transitionDelay: `${i * 60}ms`}}
                                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                            >
                                <div
                                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-3xl ring-1 ${palette}`}
                                >
                                    {meta.icon}
                                </div>
                                <h3 className="mt-4 text-base font-semibold text-gray-900">
                                    {meta.label}
                                </h3>
                                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                                    {SUBJECT_DESCRIPTIONS[subject]}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}


function SocialProof() {
    return (
        <section className="bg-gradient-to-r from-primary-600 to-primary-700 py-16">
            <div
                className="mx-auto max-w-4xl px-4 text-center text-white"
                data-reveal
            >
                <p className="text-sm font-semibold uppercase tracking-widest text-primary-200">
                    Join the community
                </p>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                    Join 10,000+ students preparing for the UPCAT
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base text-primary-100">
                    From Aparri to Zamboanga — students across the Philippines are using
                    UPCAT Simulator to sharpen their skills and walk into exam day with
                    confidence.
                </p>

                <div className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4 text-center">
                    <ProofStat value="10,000+" label="Active learners"/>
                    <ProofStat value="500,000+" label="Questions answered"/>
                    <ProofStat value="4.8⭐️" label="Average rating"/>
                </div>
            </div>
        </section>
    );
}

function ProofStat({value, label}: { value: string; label: string }) {
    return (
        <div className="rounded-2xl bg-white/10 px-4 py-5 ring-1 ring-white/20 backdrop-blur">
            <div className="text-2xl font-bold sm:text-3xl">{value}</div>
            <div className="mt-1 text-xs uppercase tracking-wider text-primary-100">
                {label}
            </div>
        </div>
    );
}


function Faq({items}: { items: FaqItem[] }) {
    return (
        <section id="faq" className="scroll-mt-24 bg-white py-20 sm:py-24">
            <div className="mx-auto max-w-3xl px-4">
                <div className="text-center" data-reveal>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                        Frequently asked questions
                    </h2>
                    <p className="mt-3 text-lg text-gray-600">
                        Everything you need to know about the UPCAT and how to prepare with
                        UPCAT Simulator.
                    </p>
                </div>

                <dl className="mt-12 divide-y divide-gray-200 border-t border-b border-gray-200">
                    {items.map((it, i) => (
                        <details
                            key={it.question}
                            data-reveal
                            style={{transitionDelay: `${i * 40}ms`}}
                            className="group py-5"
                        >
                            <summary
                                className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                                <dt>{it.question}</dt>
                                <span
                                    aria-hidden
                                    className="ml-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700 transition-transform group-open:rotate-45"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    >
                                        <path d="M12 5v14M5 12h14"/>
                                    </svg>
                                </span>
                            </summary>
                            <dd className="mt-3 pr-9 text-sm leading-relaxed text-gray-600">
                                {it.answer}
                            </dd>
                        </details>
                    ))}
                </dl>
            </div>
        </section>
    );
}


function FinalCta() {
    return (
        <section className="bg-white py-20 sm:py-24">
            <div
                className="mx-auto max-w-3xl rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50.to-white p-10 text-center shadow-sm sm:p-14 data-reveal"
                data-reveal
            >
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                    Ready to start prepping?
                </h2>
                <p className="mt-3 text-lg text-gray-600">
                    Create your account and take your first practice exam today.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <Link to="/register" className="btn-primary text-base !px-6 !py-3">
                        Get Started
                    </Link>
                    <Link to="/login" className="btn-secondary text-base !px-6 !py-3">
                        I already have an account
                    </Link>
                </div>
            </div>
        </section>
    );
}
