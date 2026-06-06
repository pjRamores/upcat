import Spinner from "@/components/Spinner";

/**
 * Centered full viewport spinner with an optional label.
 * Used for the initial auth check before the app shell is ready.
 */
export default function FullPageLoader({label = "Loading...", label?: string
})
{
    return (
        <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4 text-primary-600">
                <Spinner className="h-8 w-8"/>
                <span className="text-sm font-medium text-gray-600">{label}</span>
            </div>
        </div>
    );
}