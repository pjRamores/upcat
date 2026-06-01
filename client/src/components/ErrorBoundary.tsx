import {Component, type, ErrorInfo, type, ReactNode} from "react";
import {reportClientError} from "@/lib/clientErrorTracking";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional override for the fallback UI. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches rendering errors anywhere in its child tree and shows a friendly
 * fallback. Errors are also logged to the console; in production you would
 * forward them to your error-reporting endpoint here.
 */
export default class ErrorBoundary extends Component {
  ErrorBoundaryProps,
  ErrorBoundaryState
}:

/**
 * Catches rendering errors anywhere in its child tree and shows a friendly
 * fallback. Errors are also logged to the console; in production you would
 * forward them to your error-reporting endpoint here.
 */
export default class ErrorBoundary extends Component {
  ErrorBoundaryProps,
  ErrorBoundaryState
}:

componentDidCatch(error: Error, info: ErrorInfo): void {
  // eslint-disable-next-line no-console
  console.error("[ErrorBoundary] caught:", error, info);
  reportClientError({
    message: error.message || "React render error",
    stack: error.stack ?? null,
    componentStack: info.componentStack ?? null,
    tags: ["react-error-boundary"],
    metadata: {
      name: error.name,
    },
    severity: "error",
  });
}

handleReset = () => {
  this.setState({hasError: false, error: null});
};

handleGoHome = () => {
  this.setState({hasError: false, error: null});
  window.location.href = "/";
};

render(): ReactNode {
  if (!this.state.hasError) return this.props.children;
  if (this.props.fallback) return this.props.fallback;

  const isDev = import.meta.env.DEV;

  return (
    <div
      role="alert"
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"
    >
      <div className="w-full max-w-md rounded-2x1 border border-gray-200 bg-white p-8 text-center shadow-lg">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-3x1">
          Δ
        </div>
        <h1 className="mt-4 text-2x1 font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          An unexpected error occurred. The team has been notified -- please
          try again or head back home.
        </p>

        {isDev && this.state.error && (
          <pre
            className="mt-4 max-h-40 overflow-auto rounded-lg bg-gray-50 p-3 text-left text-xs text-primary-700">
            {this.state.error.message}
            {this.state.error.stack && "\n\n" + this.state.error.stack}
          </pre>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={this.handleReset}
            className="btn-secondary text-sm"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={this.handleGoHome}
            className="btn-primary text-sm"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
}