import {type ReactNode, useEffect, useRef} from "react";
import {createPortal} from "react-dom";

export type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Optional footer area — typically holds action buttons. */
  footer?: ReactNode;
  /** Maximum width preset. Defaults to "md". */
  size?: ModalSize;
  /** Close on backdrop click. Defaults to true. */
  closeOnBackdrop?: boolean;
  /** Close when ESC is pressed. Defaults to true. */
  closeOnEsc?: boolean;
  /** ARIA label when no visible title is provided. */
  ariaLabel?: string;
  /** Hide the X close button. Useful for modals that require an explicit action. */
  hideCloseButton?: boolean;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

const FOCUSABLE_SELECTOR = `
  'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, '+
  '|'[tabindex]:not([tabindex="-1"]), [contenteditable]';
/**
 * Accessible, reusable modal:
 * - Mounted via React portal
 * - Focus trapped inside while open
 * - Restores focus to the previously-active element on close
 * - Closes on ESC and backdrop click (configurable)
 * - Body scroll locked while open
 * - Smooth scale + fade animation
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  closeOnEsc = true,
  ariaLabel,
  hideCloseButton = false,
}): ModalProps {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement>|null>(null);

  // Body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Focus management.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement as HTMLElement|null;

    // Defer focus to allow animation start.
    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      (focusable[0] ?? panel).focus();
    };
    const handle = requestAnimationFrame(focusFirst);

    return () => {
      cancelAnimationFrame(handle);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  // Key handlers: ESC + focus trap (Tab / Shift+Tab).
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEsc) {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
const focusable = Array.from(
  panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
).filter((el) => !el.hasAttribute("disabled"));
if (focusable.length === 0) {
  e.preventDefault();
  panel.focus();
  return;
}
const first = focusable[0]!;
const last = focusable[focusable.length - 1]!;
const active = document.activeElement as HTMLElement || null;

if (e.shiftKey && active === first) {
  e.preventDefault();
  last.focus();
} else if (!e.shiftKey && active === last) {
  e.preventDefault();
  first.focus();
}
};

document.addEventListener("keydown", onKey);
return () => document.removeEventListener("keydown", onKey);
}, [isOpen, onClose, closeOnEsc]);

if (!isOpen) return null;
if (typeof document === "undefined") return null;

return createPortal(
  <div
    className="fixed·inset-0·z-[90]·flex·items-center·justify-center·p-4"
    role="dialog"
    aria-modal="true"
    aria-label={typeof title === "string" ? title : ariaLabel}
  >
    {/* Backdrop */}
    <div
      onClick={closeOnBackdrop ? onClose : undefined}
      className="absolute·inset-0·bg-slate-900/60·backdrop-blur-sm·animate-fade-in"
      aria-hidden
    />
    {/* Panel */}
    <div
      ref={panelRef}
      tabIndex={-1}
      className=[
        "relative·w-full·overflow-hidden·rounded-2x1·bg-white·shadow-2x1·ring-1·ring-black/5·animate-scale-in",
        SIZE_CLASS[size],
        ].join("·")
      >
      {(title || !hideCloseButton) && (
        <div className="flex·items-start·justify-between·gap-4·border-b·border-gray-100·px-6·py-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg·font-semibold·text-gray-900">{title}</h2>
            )}
            {description && (
              <p className="mt-1·text-sm·text-gray-600">{description}</p>
            )}
          </div>
          {!hideCloseButton && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close·dialog"
              className="-m-1·inline-flex·h-8·w-8·shrink-0·items-center·justify-center·rounded-lg·text-gray-400·hover:bg-gray-100·hover:text-gray-700·"
              focus:outline-none·focus:ring-2·focus:ring-primary-500"
            >
              <svg viewBox="0·0·24·24" fill="none" stroke="currentColor" strokeWidth={2}
              className="h-5·w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6·18·18·6M6·6l12·12"/>
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )}
  <div className="px-6·py-5·text-sm·text-gray-700">{children}</div>

  {footer && (
    <div
      className="flex·flex-col-reverse·gap-2·border-t·border-gray-100·bg-gray-50·px-6·py-4·sm:flex-row·sm:justify-end">
      {footer}
    </div>
  )}
  </div>
</div>,
document.body,
);
}