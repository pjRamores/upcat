import {Outlet, useLocation} from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import SetPasswordHint from "@/components/SetPasswordHint";
import ConsentBanner from "@/components/ConsentBanner";
import PageHelp from "@/components/help/PageHelp";
import HelpFab from "@/components/help/HelpFab";
import OnboardingTour from "@/components/help/OnboardingTour";
import SystemStatusBanner from "@/components/SystemStatusBanner";

export default function Layout() {
    const location = useLocation();

    // Distraction-free chrome on the exam page.
    const isExamRoute = /^\/exam\/[^\/]+$/i.test(location.pathname);

    if (isExamRoute) {
        return (
            <div className="min-h-screen bg-slate-50">
                <SystemStatusBanner/>
                <main id="main-content" tabIndex={-1}>
                    <Outlet/>
                </main>
                <PageHelp/>
                <OnboardingTour/>
                <HelpFab/>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-50">
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>
            <Navbar/>
            <SetPasswordHint/>
            <AnnouncementBanner/>
            <SystemStatusBanner/>
            <main
                id="main-content"
                role="main"
                tabIndex={-1}
                className="flex-1 focus:outline-none"
            >
                <Outlet/>
            </main>
            <Footer/>
            <ConsentBanner/>
            <PageHelp/>
            <OnboardingTour/>
            <HelpFab/>
        </div>
    );
}