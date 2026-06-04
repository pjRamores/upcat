return (
    <div className={className}>
        {divider && (
            <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wide text-gray-400">
                <span className="h-px flex-1 bg-gray-200" />
                <span>{divider}</span>
                <span className="h-px flex-1 bg-gray-200" />
            </div>
        )}
        <div className="grid gap-2">
            {enabledList.map((p) => (
                <button
                    key={p}
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={() => start(p)}
                    className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-60"
                >
                    {loadingProvider === p ? (
                        <Spinner className="h-4 w-4" />
                    ) : (
                        <span className="flex h-4 w-4 items-center justify-center">{ICONS[p]}</span>
                    )}
                    {purpose === "link" ? "Link" : "Continue with"} {SOCIAL_PROVIDER_META[p].label}
                </button>
            ))}
        </div>
    </div>
);