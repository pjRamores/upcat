/**
 * /account/deletion/confirm?id=...&token=... -- public confirm email landing page.
 * Hits POST /account/deletion-request/:id/confirm with the supplied token.
 * On success, sets status -> "processing" and emails the user.
 */
import {useEffect, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {deletionApi} from "@/lib/accountApi";
import Seo from "@/components/Seo";
import Spinner from "@/components/Spinner";

type State = "loading" | "ok" | "error";

export default function DeletionConfirmPage() {
    const [params] = useSearchParams();
    const id = params.get("id") ?? "";
    const token = params.get("token") ?? "";
    const [state, setState] = useState<State>("loading");
    const [errorMsg, setErrorMsg] = useState<string>("");

    useEffect(() => {
        if (!id || !token) {
            setState("error");
            setErrorMsg("Invalid confirmation link.");
            return;
        }
        deletionApi
            .confirm(id, token)
            .then(() => setState("ok"))
            .catch((err) => {
                const msg = (err as { response?: { error?: string; } }).response?.data?.error || "This link is invalid or has expired.";
                setErrorMsg(msg);
                setState("error");
            });
    }, [id, token]);

    return (
        <div className="mx-auto max-w-md px-4 py-12 text-center">
            <Seo title="Confirm account deletion" noindex/>
            {(state === "loading" && <Spinner/>)
                || (state === "ok" && (
                    <>
                        <h1 className="text-2xl font-bold text-gray-900">Deletion confirmed</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            Your account is scheduled for deletion. You'll still receive a final email once the deletion has been executed.
                        </p>
                        <Link to="/" className="btn-primary mt-4 inline-block">
                            Back to home
                        </Link>
                    </>
                ))
                || (state === "error" && (
                    <>
                        <h1 className="text-2xl font-bold text-red-700">Could not confirm</h1>
                        <p className="mt-2 text-sm text-gray-600">{errorMsg}</p>
                        <Link to="/settings" className="btn-primary mt-4 inline-block">
                            Back to settings
                        </Link>
                    </>
                ))}
        </div>
    );
}