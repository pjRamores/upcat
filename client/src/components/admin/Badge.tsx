import type { ReactNode } from "react";

const VARIANTS = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-primary-100 text-primary-700",
    info: "bg-primary-100 text-primary-700",
    violet: "bg-primary-100 text-primary-700"
} as const;

export type BadgeVariant = keyof typeof VARIANTS;

export default function Badge({
    children,
    variant = "neutral",
}: {
    children: ReactNode;
    variant?: BadgeVariant;
}) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${VARIANTS[variant]}`}
        >
            {children}
        </span>
    );
}
