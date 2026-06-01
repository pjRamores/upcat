import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {RouterProvider} from "react-router-dom";
import {HelmetProvider} from "react-helmet-async";
import {router} from "./router";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer from "./components/ToastContainer";
import InstallPwaCard from "./components/InstallPwaCard";
import {installGlobalErrorTracking} from "./lib/clientErrorTracking";
import {captureInstallPrompt, registerServiceWorker} from "./lib/pwa";
import {installGlobalResilienceHooks} from "./lib/resilience";
import {installSyncQueueHooks} from "./lib/syncQueue";
import "./index.css";

// Register the service worker + capture the install prompt as early as
// possible so the PWA install card can offer to install on first eligible
// page view.
captureInstallPrompt();
registerServiceWorker();
installGlobalErrorTracking();
installGlobalResilienceHooks();
installSyncQueueHooks();

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ErrorBoundary>
            <HelmetProvider>
                <RouterProvider router={router}/>
                <ToastContainer/>
                <InstallPwaCard/>
            </HelmetProvider>
        </ErrorBoundary>
    </StrictMode>,
);
