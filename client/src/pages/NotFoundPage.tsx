import {useEffect, useState} from "react";
import {Link, useLocation} from "react-router-dom";
import Seo from "@/components/Seo";
import apiClient from "@/lib/api";
import type {UrlRedirect} from "@upcat/shared";

interface RedirectResponse {
  success: boolean;
  data: {source: string; redirect: UrlRedirect | null};
}

/**
 * 404 page. Before rendering the standard "Not Found" view, ask the server
 * whether the unmatched path has a configured redirect (managed via the
 * admin SEO panel). If so, forward the user — preserving query string.
 */
export default function NotFoundPage() {
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<RedirectResponse>("/seo/redirect", {
        params: {from: location.pathname},
      })
      .then((res) => {
        if (cancelled) return;
        const redirect = res.data?.data?.redirect;
        if (redirect) {
          const target = redirect.destination + (location.search ?? "")
          window.location.replace(target);
          return;
        }
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  if (!checked) {
    return null;
  }

  return (
    <>
      <Seo
        title="Page Not Found | UPCAT Simulator"
        description="The page you're looking for doesn't exist."
        bare
        noindex
      />
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
        <p className="text-7x1 font-extrabold text-primary-600">404</p>
        <h1 className="mt-4 text-2x1 font-bold text-gray-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          The page you're looking for doesn't exist or was moved. Check the
          URL or try one of these:
        </p>
        <ul className="mt-6 grid w-full grid-cols-2 gap-2 text-sm">
          <li>
            <Link to="/"
              className="block rounded-md border border-gray-200 px-3 py-2 hover:border-primary-300">Home</Link>
          </li>
          <li>
            <Link to="/practice"
              className="block rounded-md border border-gray-200 px-3 py-2 hover:border-primary-300">Practice
              Tests</Link>
          </li>
          <li>
            <Link to="/leaderboard"
              className="block rounded-md border border-gray-200 px-3 py-2 hover:border-primary-300">Leaderboard</Link>
          </li>
          <li>
            <Link to="/contact"
              className="block rounded-md border border-gray-200 px-3 py-2 hover:border-primary-300">Contact
              Support</Link>
          </li>
        </ul>
        <div className="mt-8 flex gap-3">
          <Link to="/" className="btn-primary text-sm">
            Go Home
          </Link>
          <Link to="/contact" className="btn-secondary text-sm">
            Report a problem
          </Link>
        </div>
      </div>
    </>
  );
}