import {useEffect, useState} from "react";
import {getResilienceState, type ResilienceState, subscribeResilience} from "@/lib/resilience";

function formatTime(iso: string | undefined): string {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
}

export default function SystemStatusBanner() {
    const [state, setState] = useState<ResilienceState>(getResilienceState());

    useEffect(() => subscribeResilience(setState), []);

    const maintenance = state.maintenance;
    const isMaintenanceActive = Boolean(maintenance?.isActive);
    const showUpcoming = Boolean(!isMaintenanceActive && maintenance?.showBanner);

    if (state.online && !isMaintenanceActive && !showUpcoming) return null;

    if (!state.online) {
        return (
            <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-amber-900 text-sm">
                You are offline. Your actions will sync automatically once your connection is back.
            </div>
        );
    }

    if (isMaintenanceActive) {
        return (
            <div className="bg-rose-100 border-b border-rose-300 px-4 py-2 text-rose-900 text-sm">
                {maintenance?.bannerMessage || "Maintenance is in progress."}
                {maintenance?.currentWindow?.scheduledEnd
                    ? `Estimated end: ${formatTime(maintenance.currentWindow.scheduledEnd)}` : ""}
            </div>
        );
    }

    return (
        <div className="bg-sky-100 border-b border-sky-300 px-4 py-2 text-sky-900 text-sm">
            {maintenance?.bannerMessage || "Scheduled maintenance is coming soon."}
        </div>
    );
}