import { useEffect, useState } from "react";
import Modal from "@/components/Modal";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  /** When set, the user must type this exact text to enable confirmation. */
  confirmText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onClose,
}: Props) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTyped("");
      setBusy(false);
    }
  }, [isOpen]);

  const matches = !confirmText || typed.trim() === confirmText;

  const buttonClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
      : "bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50";

  const handleClose = () => {
    if (busy) return;
    setTyped("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!matches || busy) return;

    setBusy(true);
    try {
      await onConfirm();
      setTyped("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={!matches || busy}
            onClick={() => void handleConfirm()}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${buttonClass}`}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-700">{message}</p>

      {confirmText && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600">
            Type <span className="font-mono font-semibold">{confirmText}</span> to confirm
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            autoFocus
          />
        </div>
      )}
    </Modal>
  );
}
