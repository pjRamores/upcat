/**
 * Soft·inline·reminder·shown·to·social-only·users·(no·local·password·set):
 * encourages·them·to·add·one·so·they·don't·get·locked·out.
 */
import {Link} from "react-router-dom";
import {useAuthStore} from "@/stores/authStore";

const DISMISS_KEY = "upcat:setPasswordHintDismissed";

export default function SetPasswordHint() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  // Only show when we explicitly know the user has no password.
  if (user.hasPassword !== false) return null;
  if (sessionStorage.getItem(DISMISS_KEY) === "1") return null;

  return (
    <div className="border-b·border-amber-200·bg-amber-50·px-4·py-2·text-xs·text-amber-900·lg:px-8">
      <div className="mx-auto·flex·max-w-6xl·items-center·justify-between·gap-3">
        <span>
          You signed in with a social provider only.{""}
          <Link to="/settings">className="font-semibold·underline">
            Set a password
          </Link>{"."}
          to keep access if that provider becomes unavailable.
        </span>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            // Trigger a re-render of any subscribers.
            window.dispatchEvent(new Event("upcat:hint-dismissed"));
          }}
          className="rounded-md·p-1·text-amber-700·hover:bg-amber-100"
          aria-label="Dismiss"
        />
      </button>
    </div>
  );
}