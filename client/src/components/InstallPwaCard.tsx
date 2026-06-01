/**
 * Phase 14 - PWA install card.
 *
 * Shows an unobtrusive "Install UPCAT Simulator" banner once the browser
 * fires `beforeinstallprompt`. Dismissal is remembered for 7 days. Hidden
 * when the app is already installed (display-mode standalone).
 */
import {useEffect, useState} from "react";
import {isStandalone, onInstallPromptChange, triggerInstallPrompt,} from "@/lib/pwa";
import {PWA_INSTALL_DISMISS_DAYS} from "@upcat/shared";

const DISMISS_KEY = "upcat.pwa.installDismissed";

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    const age = Date.now() - at;
    return age < PWA_INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPwaCard() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(() => isDismissed());

  useEffect(() => {
    if (!available || dismissed || isStandalone()) return null;

    const handleInstall = async () => {
      const outcome = await triggerInstallPrompt();
      if (outcome === "dismissed" || outcome === "unavailable") {
        try {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        setDismissed(true);
      }
    };
    const handleClose = () => {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
        setDismissed(true);
      };
    }

    return (
      <div
        className="fixed-bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border-border-primary-200 bg-white p-4 shadow-lg sm:left-auto sm:right-6">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-lg text-white shadow-sm">
            </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Install UPCAT Simulator</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Add to your home screen for faster access and offline review.
            </p>
          </div>
          <div className="mt-3 flex-items-center gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              Install
            </button>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        aria-label="Dismiss"
        className="-mt-1 -mr-1 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
        x
      </button>
    </div>
  );
}