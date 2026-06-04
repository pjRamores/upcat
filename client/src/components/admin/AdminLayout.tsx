import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

interface NavSection {
    heading: string;
    items: { to: string; label: string; icon: string; end?: boolean }[];
}

type SectionCollapseState = Record<string, boolean>;

const NAV: NavSection[] = [
    {
        heading: "Overview",
        items: [
            { to: "/admin", label: "Dashboard", icon: "?", end: true },
            { to: "/admin/analytics", label: "Analytics", icon: "📈" },
        ],
    },
    {
        heading: "Content",
        items: [
            { to: "/admin/questions", label: "Questions", icon: "?" },
            { to: "/admin/question-sets", label: "Question Sets", icon: "🗃️" },
            { to: "/admin/questions/workflow", label: "Question Workflow", icon: "🛠️" },
            { to: "/admin/questions/import-export", label: "Import/Export", icon: "📤" },
            { to: "/admin/questions/media", label: "Media Library", icon: "🖼️" },
            { to: "/admin/passages", label: "Passages", icon: "📜" },
            { to: "/admin/help/articles", label: "Help Articles", icon: "ⓢ" },
            { to: "/admin/help/contextual", label: "Contextual Help", icon: "?" },
            { to: "/admin/help/onboarding", label: "Onboarding Flows", icon: "🚀" },
            { to: "/admin/help/analytics", label: "Help Analytics", icon: "📊" },
            { to: "/admin/content-flags", label: "Reported Issues", icon: "⚐" },
        ],
    },
    {
        heading: "People",
        items: [
            { to: "/admin/users", label: "Users", icon: "👨" },
            { to: "/admin/exams", label: "Exam Sessions", icon: "✍️" },
            { to: "/admin/practice-sessions", label: "Practice Sessions", icon: "🎯" },
        ],
    },
    {
        heading: "Platform",
        items: [
            { to: "/admin/announcements", label: "Announcements", icon: "📢" },
            { to: "/admin/settings", label: "Settings", icon: "⚙️" },
            { to: "/admin/auth-providers", label: "Social Login", icon: "🌐" },
            { to: "/admin/gamification", label: "Gamification", icon: "🏆" },
            { to: "/admin/payment/config", label: "Subscription", icon: "💳" },
            { to: "/admin/payment/submissions", label: "Submissions", icon: "🗄️" },
            { to: "/admin/features", label: "Feature Limits", icon: "⬢" },
            { to: "/admin/promo-codes", label: "Promo Codes", icon: "Ⓡ" },
            { to: "/admin/security", label: "Security", icon: "🛡️" },
            { to: "/admin/monitoring", label: "Monitoring", icon: "$LANG" },
            { to: "/admin/audit-log", label: "Audit Log", icon: "📜" },
        ],
    },
    {
        heading: "Support",
        items: [
            { to: "/admin/support", label: "Support Dashboard", icon: "☎️", end: true },
            { to: "/admin/support/tickets", label: "Tickets", icon: "🎫" },
            { to: "/admin/support/identity-disputes", label: "Identity Disputes", icon: "⚠️" },
            { to: "/admin/data-requests", label: "Data Requests", icon: "🗄️" },
        ],
    },
    {
        heading: "Marketing",
        items: [
            { to: "/admin/blog", label: "Blog Posts", icon: "✍️" },
            { to: "/admin/sec", label: "SEO & Redirects", icon: "🔍" },
            { to: "/admin/ads", label: "Ads", icon: "taboola" },
        ],
    },
    {
        heading: "Study Plan",
        items: [
            { to: "/admin/study-plans/templates", label: "Templates", icon: "⚙️" },
            { to: "/admin/study-plans/lessons", label: "Lessons", icon: "📚" },
            { to: "/admin/study-plans/analytics", label: "Analytics", icon: "📊" },
        ],
    },
];

const TITLE_MAP: Record<string, string> = {
    "/admin": "Dashboard",
    "/admin/analytics": "Analytics",
    "/admin/questions": "Questions",
    "/admin/questions/new": "New Question",
    "/admin/questions/workflow": "Question Workflow",
    "/admin/questions/import-export": "Question Import/Export",
    "/admin/question-sets": "Question Sets",
    "/admin/questions/media": "Question Media Library",
    "/admin/passages": "Passages",
    "/admin/help/articles": "Help Articles",
    "/admin/help/contextual": "Contextual Help",
    "/admin/help/onboarding": "Onboarding Flows",
    "/admin/help/analytics": "Help Analytics",
    "/admin/passages/new": "New Passage",
    "/admin/content-flags": "Reported Issues",
    "/admin/users": "Users",
    "/admin/users/new": "New User",
};
export default function AdminLayout() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [menuQuery, setMenuQuery] = useState("");
    const hasMounted = useRef(false);
    const [collapsedSections, setCollapsedSections] = useState<SectionCollapseState>(() => {
        NAV.reduce<SectionCollapseState>((acc, section) => {
            acc[section.heading] = true;
            return acc;
        }, {})
    });

    useEffect(() => {
        setOpen(false);
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }
        setCollapsedSections(() => {
            const next = NAV.reduce<SectionCollapseState>((acc, section) => {
                acc[section.heading] = true;
                return acc;
            }, {});
            const activeSection = NAV.find((section) => {
                section.items.some((item) => isNavItemActive(item, location.pathname))
            });
            if (activeSection) next[activeSection.heading] = false;
            return next;
        });
    }, [location.pathname]);

    const breadcrumbs = buildCrumbs(location.pathname);
    const normalizedMenuQuery = menuQuery.trim().toLowerCase();
    const hasMenuQuery = normalizedMenuQuery.length > 0;
    const filteredNav = hasMenuQuery
        ? NAV.map((section) => {
            const headingMatch = section.heading.toLowerCase().includes(normalizedMenuQuery);
            const matchedItems = headingMatch
                ? section.items
                : section.items.filter((item) => {
                    `${item.label} ${item.to}`.toLowerCase().includes(normalizedMenuQuery),
                });
            return {...section, items: matchedItems};
        }).filter((section) => section.items.length > 0)
        : NAV;

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
                    <Link to="/admin" className="flex items-center gap-2 text-primary-700">
                        <ShieldIcon className="h-6 w-6" />
                        <span className="font-bold">Admin</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        aria-label="Close menu"
                        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
                    >
                        <X />
                    </button>
                </div>
                <div className="border-b border-slate-200 px-3 py-3">
                    <label htmlFor="admin-menu-search" className="sr-only">
                        Search admin menu
                    </label>
                    <div className="relative">
                        <input
                            id="admin-menu-search"
type="search"
value={menuQuery}
onChange={(e) => setMenuQuery(e.target.value)}
placeholder="Search menu..."
className="w-full rounded-md border-slate-300 px-3 py-2 pr-8 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
/>
{menuQuery && (
  <button
    type="button"
    onClick={() => setMenuQuery("")}
    aria-label="Clear menu search"
    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
  >
    X
  </button>
)}
</div>
<nav className="space-y-6 px-3 py-5">
  {filteredNav.map((section) => (
    <div key={section.heading}>
      {!hasMenuQuery && (
        <button
          type="button"
          className="mb-2 flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-100"
          onClick={() => {
            const isCurrentlyOpen = !prev[section.heading];
            const next = NAV.reduce<SectionCollapseState>((acc, navSection) => {
              acc[navSection.heading] = true;
              return acc;
            }, {});
            if (!isCurrentlyOpen) next[section.heading] = false;
            return next;
          }}
          aria-expanded={!collapsedSections[section.heading]}
          aria-controls={`admin-nav-group-${slugify(section.heading)}}
        >
          <span>{section.heading}</span>
          <span aria-hidden className="text-[10px] text-slate-500">{collapsedSections[section.heading] ? "□" : "□"}</span>
        </button>
      )}
      {hasMenuQuery && (
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.heading}</p>
      )}
      {(hasMenuQuery || !collapsedSections[section.heading]) && (
        <ul id={`admin-nav-group-${slugify(section.heading)}} className="space-y-1">
          {section.items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className={(isActive) => [
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive ? "bg-primary-50 font-semibold text-primary-700" : "text-slate-700 hover:bg-slate-100",
              ].join(" ")}>
                <span aria-hidden>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  ))}
  {hasMenuQuery && filteredNav.length === 0 && (
    <p className="px-2 text-sm text-slate-500">No menu items found.</p>
  )}
</nav>
</aside>
{open && (
  <div
    className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
    onClick={() => setOpen(false)}
    aria-hidden
  />
)}

{/* Main */}
<div className="flex min-w-0 flex-1 flex-col">
  <header
    className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm lg:px-8"
  >
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
      aria-label="Open menu"
    >
function buildCrumbs(pathname: string) {
    const segs = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; path: string }[] = [];
    let acc = "";
    for (const s of segs) {
        acc += `/${s}`;
        crumbs.push({ label: TITLE_MAP[acc] ?? prettify(s), path: acc });
    }
    return crumbs.length ? crumbs : [{ label: "Admin", path: "/admin" }];
}

function isNavItemActive(item: { to: string; end?: boolean }, pathname: string) {
    if (item.end) return pathname === item.to;
    return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function slugify(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^+|-+$/g, "");
}

function prettify(s: string) {
    if (/^[a-f0-9]{24}$/i.test(s)) return "Detail";
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ".");
}

function ShieldIcon({ className = "h-6 w-6" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
            <path d="M12 2 4.5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6.8-11v51-8-32"/>
        </svg>
    );
}