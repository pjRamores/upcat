import {Link} from "react-router-dom";

export default function PaymentFailedPage() {
  return (
    <div className="mx-auto max-w-2x1 px-4 py-16 text-center">
      <h1 className="text-3x1 font-bold text-rose-700">Payment Failed</h1>
      <p className="mt-3 text-slate-700">Your payment could not be processed. No charges were made.</p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link to="/pricing"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">Try
        </Link>
        <Link to="/support"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Contact
        </Link>
      </div>
    </div>
  );
}