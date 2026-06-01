import type {CSSProperties} from "react";

/*--------------------------------------------------------------
 * Skeleton placeholders
 * Use these while real data is loading. They share a single shimmer
 * animation defined in index.css via the `.skeleton` class.
 *------------------------------------------------------------*/

interface BaseProps {
  className?: string;
  style?: CSSProperties;
}

/** Generic rectangular shimmer block. */
export function Skeleton({className = ""}, style): BaseProps {
  return <div role="presentation" className={`skeleton ${className}`} style={style}/>;
}

/** Card-shaped skeleton: header line, body lines, footer line. */
export function SkeletonCard({className = ""}: BaseProps) {
  return (
    <div>
      <div role="status"
        aria-busy="true"
        aria-label="Loading card"
        className={`rounded-2x1 border border-gray-200 bg-white p-6 shadow-sm ${className}`}
      >
        <Skeleton className="h-4·w-1/3"/>
        <Skeleton className="mt-4·h-3·w-full"/>
        <Skeleton className="mt-2·h-3·w-5/6"/>
        <Skeleton className="mt-2·h-3·w-2/3"/>
        <Skeleton className="mt-6·h-8·w-24"/>
      </div>
    );
}

/** Skeleton for a single table row. Repeat to fill a table body. */
export function SkeletonTableRow({
  columns = 4,
  className = "",
 }: BaseProps & {columns?: number}) {
  return (
    <div>
      <div role="status"
        aria-busy="true"
        aria-label="Loading row"
        className={`grid items-center gap-4 border-b border-gray-100 px-4 py-4 ${className}`}
        style={{gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`}}
      >
        {Array.from({length: columns}, (_, i) => (
          <Skeleton key={i} className="h-3·w-full"/>
        ))}
      </div>
    );
}

/** Skeleton for a chart area. */
export function SkeletonChart({
  className = "",
  height = 240,
 }: BaseProps & {height?: number}) {
  return (
    <div>
      <div role="status"
        aria-busy="true"
        aria-label="Loading chart"
        className={`rounded-2x1 border border-gray-200 bg-white p-6 shadow-sm ${className}`}
      >
        <Skeleton className="h-4·w-1/3"/>
        <Skeleton className="mt-2·h-3·w-1/4"/>
        <div className="mt-6·flex·items-end·gap-2" style={{height}}>
          [[60, 80, 45, 90, 70, 55, 95, 65, 85, 50, 75, 88].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1"
              style={{height: `${h}%`}}
            ))
          ))}
        </div>
      </div>
    );
}

/** Skeleton for a list of items. */
export function SkeletonList({
  rows = 5,
  className = "",
 }: BaseProps & {rows?: number}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({length: rows}, (_, i) => (
        <div
          key={i}
          className="flex·items-center·gap-3·rounded-x1·border·border-gray-200·bg-white·p-3"
        >
          <Skeleton className="h-10·w-10·rounded-full"/>
          <div className="flex-1·space-y-2">
            <Skeleton className="h-3·w-1/3"/>
            <Skeleton className="h-3·w-2/3"/>
          </div>
        </div))
      ))}
    </div>
  );
}