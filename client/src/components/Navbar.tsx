import {useEffect, useRef, useState} from "react";
import {Link, NavLink, useLocation, useNavigate} from "react-router-dom";
import {createPortal} from "react-dom";
import {useAuthStore} from "@/stores/authStore";

/**
 * Top navigation bar
 * - Sticky, white/blur backdrop, subtle bottom border
 * - Active link underline indicator
 * - Authenticated: avatar circle + dropdown menu (Dashboard / Stats /
 *   Settings / Logout)
 * - Unauthenticated: ghost Login + filled Sign Up
 * - Mobile: hamburger button opens a slide-in drawer from the right
 * - "Features" link appears only on the landing page
 */

export default function Navbar() {
    const {isAuthenticated, logout, user, isLoading, fetchMe} = useAuthStore();
    const isAdmin = useAuthStore((s) => s.isAdmin());
    const navigate = useNavigate();
    const location = useLocation();
    const isLanding = location.pathname === "/";

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);


    useEffect(() => {
        setDrawerOpen(false);
        setMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (isAuthenticated && !user && !isLoading) {
            void fetchMe();
        }
    }, [fetchMe, isAuthenticated, isLoading, user]);

    const handleLogout = () => {
        setMenuOpen(false);
        setDrawerOpen(false);
        logout();
        navigate("/");
    };

    const goToFeatures = (e: React.MouseEvent) => {
        e.preventDefault();
        setDrawerOpen(false);
        if (isLanding) {
            document
                .getElementById("features")
                ?.scrollIntoView({behavior: "smooth", block: "start"});
        } else {
            navigate("/#features");
        }
    };

    return (
        <header
            className="sticky top-0 z-40 border-b border-gray-200 bg-white/85 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                <Link
                    to={isAuthenticated ? (isAdmin ? "/admin" : "/dashboard") : "/"}
                    className="group flex items-center gap-2 text-lg font-bold text-primary-600 hover:text-primary-700 transition-colors"
                >
                    <CapIcon className="h-6 w-6"/>
                    <span>
                        UPCAT <span className="text-gray-900">Sim</span>
                    </span>
                </Link>

                {/* Desktop navigation links */}
                <nav
                    aria-label="Primary"
                    className="hidden items-center gap-1 md:flex"
                >
                    <NavItem to="/" exact>
                        Home
                    </NavItem>
                    {isLanding && (
                        <a
                            href="/#features"
                            onClick={goToFeatures}
                            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                        >
                            Features
                        </a>
                    )}
                    {isAuthenticated && !isAdmin && <NavItem to="/stats">Stats</NavItem>}
                    <NavItem to="/terms">Terms</NavItem>
                    <NavItem to="/privacy">Privacy</NavItem>
                    <NavItem to="/contact">Contact</NavItem>
                    <NavItem to="/help">Help</NavItem>
                </nav>

                {/* Right side: auth controls */}
                <div className="flex items-center gap-2">
                    {isAuthenticated ? (
                        <div className="hidden md:block">
                            <UserMenu
                                user={user}
                                isAdmin={isAdmin}
                                open={menuOpen}
                                setOpen={setMenuOpen}
                                onLogout={handleLogout}
                            />
                        </div>
                    ) : (
                        <div className="hidden items-center gap-2 md:flex">
                            <Link
                                to="/login"
                                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                            >
                                Login
                            </Link>
                            <Link to="/register" className="btn-primary !py-2 !px-4 text-xs">
                                Sign Up
                            </Link>
                        </div>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open menu"
                        aria-expanded={drawerOpen}
                        aria-controls="mobile-drawer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                </div>
            </div>

            <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isAuthenticated={isAuthenticated}
                isAdmin={isAdmin}
                userName={user?.firstName ?? null}
                userLast={user?.lastName ?? null}
                isLanding={isLanding}
                onFeaturesClick={goToFeatures}
                onLogout={handleLogout}
            />
        </header>
    );
}

/** Desktop nav item with active indicator */
function NavItem({
                     to,
                     exact,
                     children,
                 }: {
    to: string;
    exact?: boolean;
    children: React.ReactNode;
}) {
    return (
        <NavLink
            to={to}
            end={exact}
            className={(isActive) =>
                [
                    "relative rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                        ? "font-semibold text-primary-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-primary-600",
                ].join(" ")
            }
        >
            {({isActive}) => (
                <span className="relative">
            {children}
                    {isActive && (
                        <span
                            aria-hidden
                            className="absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-primary-600"
                        />
                    )}
                </span>
            )}
        </NavLink>
    );
}

/** User dropdown (desktop) */
function UserMenu({
                      user,
                      isAdmin,
                      open,
                      setOpen,
                      onLogout,
                  }: {
    user: { firstName: string; lastName: string; email: string } | null;
    isAdmin: boolean;
    open: boolean;
    setOpen: (v: boolean) => void;
    onLogout: () => void;
}) {
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Click outside + ESC to close.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, setOpen]);

    const initials =
        (user?.firstName?.[0] ?? "").toUpperCase() +
        (user?.lastName?.[0] ?? "").toUpperCase();

    return (
        <div ref={wrapperRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                aria-haspopup="menu"
                aria-expanded={open}
                className="flex items-center gap-2 rounded-full p-0.5 pr-3 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
        <span
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 ring-2 ring-white"
            {initials || "?"}
            </span>
            <span className="hidden text-sm font-medium text-gray-700 sm:inline">
        {user?.firstName ?? "Account"}
        </span>
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.9 6.6 6.6 6"/>
            </svg>
        </button>

    {
        open && (
            <div role="menu"
                 className="animate-fade-in absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ring-1 ring-black/5"
            >
                <div className="border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">
                        {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="py-1">
                    {!isAdmin && (
                        <>
                            <MenuLink to="/dashboard" icon="⌂">
                                Dashboard
                            </MenuLink>
                            <MenuLink to="/profile" icon="👤">
                                Profile &amp; XP
                            </MenuLink>
                            <MenuLink to="/leaderboard" icon="🏆">
                                Leaderboard
                            </MenuLink>
                            <MenuLink to="/practice" icon="✍️">
                                Review
                            </MenuLink>
                            <MenuLink to="/practice/stats" icon="📊">
                                Review Stats
                            </MenuLink>
                            <MenuLink to="/stats" icon="📈">
                                My Statistics
                            </MenuLink>
                            <MenuLink to="/settings" icon="⚙️">
                                Settings
                            </MenuLink>
                            <MenuLink to="/help" icon="❓">
                                Help Center
                            </MenuLink>
                        </>
                    )}
                    {isAdmin && (
                        <Link
                            to="/admin"
                            role="menuitem"
                            className="flex items-center gap-3 border-t border-gray-100 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
                        >
                            <span aria-hidden>Admin Panel</span>
                        </Link>
                    )}
                </div>
                <div className="border-t border-gray-100 py-1">
                    <button
                        type="button"
                        role="menuitem"
                        onClick={onLogout}
                    >
                        <span aria-hidden>⏎</span> Logout
                    </button>
                </div>
            </div>
        )
    }
</div>
);
}

function MenuLink({
                      to,
                      icon,
                      children,
                  }): {
    to: string;
    icon: string;
    children: React.ReactNode;
} {
    return (
        <Link
            to={to}
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        >
            <span aria-hidden>{icon}</span>
            {children}
        </Link>
    );
}

/* ------------------- Mobile slide-in drawer ------------------- */
function MobileDrawer({
open,
onClose,
isAuthenticated,
isAdmin,
userName,
userLast,
isLanding,
onFeaturesClick,
onLogout,
}): {
open: boolean;
onClose: () => void;
isAuthenticated: boolean;
isAdmin: boolean;
userName: string | null;
userLast: string | null;
isLanding: boolean;
onFeaturesClick: (e: React.MouseEvent) => void;
onLogout: () => void;
} {
useEffect(() => {
if (!open) return;
const original = document.body.style.overflow;
document.body.style.overflow = "hidden";
const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
document.addEventListener("keydown", onKey);
return () => {
document.body.style.overflow = original;
document.removeEventListener("keydown", onKey);
};
}, [open, onClose]);

if (!open || typeof document === "undefined") return null;

const initials =
(userName?.[0] ?? "") + (userLast?.[0] ?? "")).toUpperCase() || "?";

return createPortal(
<div
id="mobile-drawer"
role="dialog"
aria-modal="true"
aria-label="Mobile menu"
className="fixed inset-0 z-[80] md:hidden"
>
<div onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" aria-hidden />
<aside
className="animate-drawer-in absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl"
>
<div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
<span className="flex items-center gap-2 font-bold text-primary-600">
<CapIcon className="h-5 w-5" />
UPCAT Sim
</span>
</div>
<button type="button" onClick={onClose} aria-label="Close menu" className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
<svg viewBox="0.0 0.24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
<path strokeLinecap="round" strokeLinejoin="round" d="M6.18 18.6M6.612 12"/>
</svg>
</button>
</aside>
</div>
);
}
{ isAuthenticated && (
<div className="flex items-center gap-3 border-b border-gray-100 px-4 py-4">
<span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">{initials}</span>
<div className="min-w-0">
<p className="truncate text-sm font-semibold text-gray-900">{userName} {userLast}</p>
<p className="text-xs text-gray-500">Signed in</p>
</div>
</div>
)}

<nav className="flex-1 overflow-y-auto p-2 text-sm" aria-label="Mobile">
<DrawerLink to="/" onClick={onClose} exact>
<HomeIcon />
Home
</DrawerLink>
{isLanding && (
<a href="#/features" onClick={onFeaturesClick} className="block rounded-lg px-3 py-2.5 text-gray-700 hover:bg-gray-100">
Features
</a>
)}
{isAuthenticated && (!isAdmin) && (
<>
<DrawerLink to="/dashboard" onClick={onClose}>
Dashboard
</DrawerLink>
<DrawerLink to="/profile" onClick={onClose}>
Profile & XP
</DrawerLink>
<DrawerLink to="/leaderboard" onClick={onClose}>
Leaderboard
</DrawerLink>
<DrawerLink to="/practice" onClick={onClose}>
Review
</DrawerLink>
<DrawerLink to="/practice/stats" onClick={onClose}>
Review Stats
</DrawerLink>
<DrawerLink to="/stats" onClick={onClose}>
Stats
</DrawerLink>
<DrawerLink to="/settings" onClick={onClose}>
Settings
</DrawerLink>
</>
)}
{isAdmin && (
<NavLink to="/admin" onClick={onClose} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
Admin Panel
</NavLink>
)}
</nav>
<hr className="my-2 border-gray-100" />
<DrawerLink to="/terms" onClick={onClose}>
Terms
</DrawerLink>
<DrawerLink to="/privacy" onClick={onClose}>
Privacy
</DrawerLink>
<DrawerLink to="/contact" onClick={onClose}>
Contact
</DrawerLink>
<DrawerLink to="/help" onClick={onClose}>
Help
</DrawerLink>
</nav>

<div className="border-t border-gray-100 p-4">
{isAuthenticated ? (
<button type="button" onClick={onLogout} className="block w-full rounded-lg bg-primary-50 px-3 py-2 text-center text-sm font-semibold text-primary-600 hover:bg-primary-100">
Logout
</button>
) : (
<div className="grid gap-2">
<Link to="/login" onClick={onClose} className="btn-secondary w-full text-sm">
Login
</Link>
<Link to="/register" onClick={onClose} className="btn-primary w-full text-sm">
function DrawerLink({
to,
onClick: () => void;
exact?: boolean;
children: React.ReactNode;
}) {
return (
<NavLink
to={to}
end={exact}
onClick={onClick}
className={(isActive) =>
[
"block rounded-lg px-3 py-2.5 text-sm transition-colors",
isActive ? "bg-primary-50 font-semibold text-primary-700" : "text-gray-700 hover:bg-gray-100",
].join(" ")
}
>
{children}
</NavLink>
);
}

function CapIcon({ className = "h-6 w-6" }: { className?: string }) {
return (
<svg
viewBox="0 0 24 24"
fill="none"
aria-hidden
className={className}
>
<path d="M2.95 12.41L10.55 L12.15 2.95z" fill="currentColor" opacity="0.95" />
<path d="M6 11.5v4.2c0 .9-2.7 2.3-6.2 2.3s-6-1.4-6-2.3v-4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
<path d="M21 10v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
</svg>
);
}