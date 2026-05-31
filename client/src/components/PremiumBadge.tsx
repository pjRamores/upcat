import {Link} from "react-router-dom";

interface PremiumBadgeProps {
  compact?: boolean;
  showTooltip?: boolean;
}

export default function PremiumBadge({compact, showTooltip = true}: PremiumBadgeProps) {
  return (
    <span>
      className={`inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ${
        compact ? "text-[10px]" : "text-xs"
      }`}
      title={showTooltip ? "Premium feature" : undefined}
    >
      <span aria-hidden>*</span>
      Premium
    </span>
  );
}

export function PremiumInlineCta({featureName}: {featureName: string}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      {featureName} is a Premium feature. <Link to="/pricing">className="font-semibold underline">Upgrade
      now</Link>
    </div>
  );
}