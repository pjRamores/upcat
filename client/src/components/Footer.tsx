import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

/**
 * Site-wide footer
 * Slate-900 dark background, white text
 * 3-column layout that collapses on mobile
 * Bottom bar with copyright and "Made with ❤ in the Philippines"
 * Includes the mandatory non-affiliation disclaimer
 */

export default function Footer() {
    const year = new Date().getFullYear();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

    return (
        <footer role="contentinfo" className="mt-auto bg-slate-900 text-slate-300">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
                <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Column 1: brand + tagline + disclaimer */}
                    <div>
                        <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-white">
                            UPCAT Simulator
                        </Link>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400">
                            A modern practice platform for UPCAT-bound students. Realistic exams, instant scoring,
                            and analytics — built to help learners walk into exam day prepared.
                        </p>
                        <p className="mt-4 rounded-md border border-slate-700/60 bg-slate-800/60 p-3 text-xs leading-relaxed text-slate-400">
                            <strong className="text-slate-200">Disclaimer:</strong> Not affiliated with, endorsed by,
                            or connected to the University of the Philippines or the UPCAT examination.
                        </p>
                    </div>

                    {/* Column 2: quick links */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-200">
                            Quick Links
                        </h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <FooterLink to="/">Home</FooterLink>
                            <FooterLink to="/practice">Practice Test</FooterLink>
                            <FooterLink to="/leaderboard">Leaderboard</FooterLink>
                            <FooterLink to="/blog">Blog</FooterLink>
                            {isAuthenticated && (
                                <>
                                    <FooterLink to="/dashboard">Dashboard</FooterLink>
                                    <FooterLink to="/stats">My Statistics</FooterLink>
                                </>
                            )}
                            <FooterLink to="/terms">Terms and Conditions</FooterLink>
                            <FooterLink to="/privacy">Privacy Policy</FooterLink>
                            <FooterLink to="/contact">Contact</FooterLink>
                        </ul>
                    </div>

                    {/* Column 3: subjects */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-200">
                            UPCAT Subjects
                        </h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            <FooterLink to="/subjects/mathematics">Mathematics</FooterLink>
                            <FooterLink to="/subjects/science">Science</FooterLink>
                            <FooterLink to="/subjects/language-proficiency">Language Proficiency</FooterLink>
                            <FooterLink to="/subjects/reading-comprehension">Reading Comprehension</FooterLink>
                        </ul>
                    </div>

                    {/* Column 4: feedback */}
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-200">
                            Support
                        </h3>
                        <p className="mt-4 text-sm text-slate-400">
                            Have feedback or questions? Reach out using the{" "}
                            <Link to="/contact" className="text-primary-300 hover:text-primary-200">
                                contact form
                            </Link>{" "}
                            We read every message and aim to respond promptly.
                        </p>
                    </div>
                </div>

                <hr className="my-8 border-slate-800"/>

                <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row">
                    <p>© {year} UPCAT Simulator. All rights reserved.</p>
                    <p className="flex items-center gap-1">
                        Made with <span aria-hidden className="text-primary-400">❤</span> in
                    </p>
                </div>
            </div>
        </footer>
    );
}
function FooterLink({ 
    to,
    children,
}: { 
    to: string;
    children: React.ReactNode;
}) {
    return (
        <li>
            <Link to={to} className="text-slate-400 transition hover:text-white">
                {children}
            </Link>
        </li>
    );
}